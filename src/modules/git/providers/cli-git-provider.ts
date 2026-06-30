import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { type ExecaError, execa } from "execa";
import { getConfig } from "#/platform/config";
import type { GitProvider, RepositoryInfo } from "../git-provider";

const REPO_NAME_RE = /^[a-zA-Z0-9._-]+$/;

const DEFAULT_DESC =
	"Unnamed repository; edit this file to 'name' the repository.";
const MAX_NAME_LENGTH = 100;

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
