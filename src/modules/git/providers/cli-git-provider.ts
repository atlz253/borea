import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { type ExecaError, execa } from "execa";
import { getConfig } from "#/platform/config";
import type {
	GitProvider,
	GitService,
	ListFilesOptions,
	RepositoryInfo,
	TreeEntry,
	TreeEntryType,
} from "../git-provider";

const REPO_NAME_RE = /^[a-zA-Z0-9._-]+$/;

const DEFAULT_DESC =
	"Unnamed repository; edit this file to 'name' the repository.";
const MAX_NAME_LENGTH = 100;
const MAX_PATH_LENGTH = 1024;
const DEFAULT_REF = "HEAD";
const LS_TREE_SEPARATOR = "\t";
const SIZE_PLACEHOLDER = "-";
const LS_TREE_MIN_PARTS = 4;

export class CliGitProvider implements GitProvider {
	private readonly storagePath: string;
	private readonly gitBin: string;

	constructor(storagePath?: string, gitBin?: string) {
		const cfg = getConfig();
		this.storagePath = storagePath ?? cfg.storagePath;
		this.gitBin = gitBin ?? cfg.gitBinPath;
	}

	async init(name: string, description?: string): Promise<RepositoryInfo> {
		this.validateName(name);
		const repoPath = this.resolvePath(name);

		if (existsSync(repoPath)) {
			throw new Error(`Repository "${name}" already exists`);
		}

		await mkdir(this.storagePath, { recursive: true });

		try {
			await execa(this.gitBin, ["init", "--bare", repoPath]);
		} catch (error) {
			if (error instanceof Error && "exitCode" in error) {
				const e = error as ExecaError;
				throw new Error(
					`git init failed (exit ${e.exitCode}): ${e.shortMessage}`,
				);
			}
			throw error;
		}

		if (description) {
			await writeFile(path.join(repoPath, "description"), description, "utf-8");
		}

		return this.getInfo(name, repoPath);
	}

	async list(): Promise<RepositoryInfo[]> {
		try {
			await mkdir(this.storagePath, { recursive: true });
			const entries = await readdir(this.storagePath, { withFileTypes: true });
			const repos: RepositoryInfo[] = [];

			for (const entry of entries) {
				if (!entry.isDirectory()) {
					continue;
				}
				const repoPath = path.join(this.storagePath, entry.name);
				if (existsSync(path.join(repoPath, "HEAD"))) {
					repos.push(await this.getInfo(entry.name, repoPath));
				}
			}

			repos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			return repos;
		} catch {
			return [];
		}
	}

	async exists(name: string): Promise<boolean> {
		const repoPath = this.resolvePath(name);
		return existsSync(repoPath) && existsSync(path.join(repoPath, "HEAD"));
	}

	async listFiles(
		name: string,
		options?: ListFilesOptions,
	): Promise<TreeEntry[]> {
		this.validateName(name);
		const repoPath = this.resolvePath(name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const ref = options?.ref ?? DEFAULT_REF;
		const subPath = this.normalizePath(options?.path);

		if (!(await this.refExists(repoPath, ref))) {
			return [];
		}

		const treeish = subPath ? `${ref}:${subPath}` : ref;

		let output: string;
		try {
			const result = await execa(this.gitBin, [
				"--git-dir",
				repoPath,
				"ls-tree",
				"--long",
				treeish,
			]);
			output = result.stdout;
		} catch {
			throw new Error(`Path "${subPath}" not found in repository "${name}"`);
		}

		return this.parseLsTree(output);
	}

	async advertiseRefs(
		name: string,
		service: GitService,
	): Promise<ReadableStream<Uint8Array>> {
		this.validateName(name);
		const repoPath = this.resolvePath(name);
		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const cmdName = this.gitCommandName(service);
		const subprocess = execa(this.gitBin, [
			"--git-dir",
			repoPath,
			cmdName,
			"--stateless-rpc",
			"--advertise-refs",
			repoPath,
		]);

		return Readable.toWeb(subprocess.stdout) as ReadableStream<Uint8Array>;
	}

	async invokeService(
		name: string,
		service: GitService,
		input: ReadableStream<Uint8Array>,
	): Promise<ReadableStream<Uint8Array>> {
		this.validateName(name);
		const repoPath = this.resolvePath(name);
		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const cmdName = this.gitCommandName(service);
		const subprocess = execa(this.gitBin, [
			"--git-dir",
			repoPath,
			cmdName,
			"--stateless-rpc",
			repoPath,
		]);

		const inputNode = Readable.fromWeb(input as never);
		inputNode.pipe(subprocess.stdin);

		subprocess.catch(() => {});

		return Readable.toWeb(subprocess.stdout) as ReadableStream<Uint8Array>;
	}

	private gitCommandName(service: GitService): string {
		switch (service) {
			case "git-upload-pack":
				return "upload-pack";
			case "git-receive-pack":
				return "receive-pack";
		}
	}

	private async refExists(repoPath: string, ref: string): Promise<boolean> {
		try {
			await execa(this.gitBin, [
				"--git-dir",
				repoPath,
				"rev-parse",
				"--verify",
				"--quiet",
				`${ref}^{commit}`,
			]);
			return true;
		} catch {
			return false;
		}
	}

	private parseLsTree(stdout: string): TreeEntry[] {
		const entries: TreeEntry[] = [];
		const lines = stdout.split("\n");

		for (const line of lines) {
			if (!line) {
				continue;
			}

			const tabIdx = line.indexOf(LS_TREE_SEPARATOR);
			if (tabIdx === -1) {
				continue;
			}

			const meta = line.slice(0, tabIdx);
			const name = line.slice(tabIdx + 1);
			const parts = meta.trim().split(/\s+/);
			if (parts.length < LS_TREE_MIN_PARTS) {
				continue;
			}

			const mode = parts[0];
			const type = parts[1];
			const sizeStr = parts[3];

			if (type !== "blob" && type !== "tree") {
				continue;
			}

			const entry: TreeEntry = {
				name,
				type: type as TreeEntryType,
				mode,
			};

			if (type === "blob" && sizeStr !== SIZE_PLACEHOLDER) {
				const size = Number.parseInt(sizeStr, 10);
				if (!Number.isNaN(size)) {
					entry.size = size;
				}
			}

			entries.push(entry);
		}

		return entries;
	}

	private normalizePath(p: string | undefined): string | undefined {
		if (!p || p.length === 0) {
			return undefined;
		}
		this.validatePath(p);
		return p;
	}

	private validatePath(p: string): void {
		if (p.includes("\0")) {
			throw new Error("Path cannot contain null bytes");
		}
		if (p.length > MAX_PATH_LENGTH) {
			throw new Error("Path is too long");
		}
		for (const seg of p.split("/")) {
			if (seg === "..") {
				throw new Error("Path cannot contain parent-directory segments");
			}
		}
	}

	private async getInfo(
		name: string,
		repoPath: string,
	): Promise<RepositoryInfo> {
		let description: string | undefined;

		try {
			const descContent = await readFile(
				path.join(repoPath, "description"),
				"utf-8",
			);
			const trimmed = descContent.trim();
			if (trimmed && trimmed !== DEFAULT_DESC) {
				description = trimmed;
			}
		} catch {
			// description file missing
		}

		const stats = await stat(repoPath);
		return {
			name,
			description,
			createdAt: stats.birthtime ?? stats.mtime,
		};
	}

	private resolvePath(name: string): string {
		const resolved = path.resolve(this.storagePath, name);
		const root = path.resolve(this.storagePath);
		if (!resolved.startsWith(root)) {
			throw new Error("Invalid repository name");
		}
		return resolved;
	}

	private validateName(name: string): void {
		if (!name) {
			throw new Error("Repository name is required");
		}
		if (!REPO_NAME_RE.test(name)) {
			throw new Error(
				"Repository name must contain only letters, numbers, dots, hyphens, and underscores",
			);
		}
		if (name === "." || name === ".." || name.startsWith(".")) {
			throw new Error("Repository name cannot start with a dot");
		}
		if (name.length > MAX_NAME_LENGTH) {
			throw new Error("Repository name is too long (max 100 characters)");
		}
		if (name.toLowerCase().endsWith(".git")) {
			throw new Error("Repository name cannot end with .git");
		}
	}
}

export const gitProvider: GitProvider = new CliGitProvider();
