import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { type ExecaError, execa } from "execa";
import { getConfig } from "#/platform/config";
import type {
	BranchInfo,
	CommitDetail,
	CommitInfo,
	DiffFile,
	GetCommitDiffResult,
	GitProvider,
	GitService,
	ListCommitsOptions,
	ListFilesOptions,
	MergeOptions,
	MergeResult,
	MergeStatus,
	RepositoryInfo,
	TreeEntry,
} from "../git-provider";
import {
	computeMergeTree,
	gitCommandName,
	isAncestor,
	refExists,
	revParse,
} from "./cli-git-helpers";
import {
	DEFAULT_LOG_LIMIT,
	DEFAULT_REF,
	EXTENDED_LOG_FORMAT,
	LOG_FORMAT,
	parseLogOutput,
	parseLsTree,
	parseNameStatus,
	parseUnifiedDiff,
} from "./cli-git-parsers";
import {
	DEFAULT_DESC,
	normalizePath,
	resolvePath,
	validateName,
	validateSha,
} from "./cli-git-validators";

export class CliGitProvider implements GitProvider {
	private readonly storagePath: string;
	private readonly gitBin: string;

	constructor(storagePath?: string, gitBin?: string) {
		const cfg = getConfig();
		this.storagePath = storagePath ?? cfg.storagePath;
		this.gitBin = gitBin ?? cfg.gitBinPath;
	}

	async init(name: string, description?: string): Promise<RepositoryInfo> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

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
		const repoPath = resolvePath(this.storagePath, name);
		return existsSync(repoPath) && existsSync(path.join(repoPath, "HEAD"));
	}

	async listFiles(
		name: string,
		options?: ListFilesOptions,
	): Promise<TreeEntry[]> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const ref = options?.ref ?? DEFAULT_REF;
		const subPath = normalizePath(options?.path);

		if (!(await refExists(this.gitBin, repoPath, ref))) {
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

		return parseLsTree(output);
	}

	async createBranch(
		name: string,
		branch: string,
		fromRef?: string,
	): Promise<BranchInfo> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const args = ["--git-dir", repoPath, "branch", branch];
		if (fromRef) {
			args.push(fromRef);
		}

		try {
			await execa(this.gitBin, args);
		} catch (error) {
			if (error instanceof Error && "exitCode" in error) {
				const e = error as ExecaError;
				const msg = String(e.stderr ?? "").trim() || e.shortMessage;
				if (msg.includes("already exists")) {
					throw new Error(`Branch "${branch}" already exists`);
				}
				throw new Error(`Failed to create branch: ${msg}`);
			}
			throw error;
		}

		return { name: branch, isHead: false };
	}

	async listBranches(name: string): Promise<BranchInfo[]> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		try {
			const { stdout } = await execa(this.gitBin, [
				"--git-dir",
				repoPath,
				"for-each-ref",
				"--format=%(refname:short)%00%(HEAD)",
				"refs/heads",
			]);

			if (!stdout) return [];

			return stdout
				.split("\n")
				.filter((line) => line.length > 0)
				.map((line) => {
					const [branchName, headMarker] = line.split("\0");
					return { name: branchName, isHead: headMarker === "*" };
				});
		} catch {
			return [];
		}
	}

	async listCommits(
		name: string,
		options?: ListCommitsOptions,
	): Promise<CommitInfo[]> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const ref = options?.ref ?? DEFAULT_REF;
		const limit = options?.limit ?? DEFAULT_LOG_LIMIT;

		if (!(await refExists(this.gitBin, repoPath, ref))) {
			return [];
		}

		try {
			const { stdout } = await execa(this.gitBin, [
				"--git-dir",
				repoPath,
				"log",
				`--pretty=format:${LOG_FORMAT}`,
				"-n",
				String(limit),
				ref,
			]);

			return parseLogOutput(stdout);
		} catch {
			return [];
		}
	}

	async countCommits(name: string, ref?: string): Promise<number> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const resolvedRef = ref ?? DEFAULT_REF;

		if (!(await refExists(this.gitBin, repoPath, resolvedRef))) {
			return 0;
		}

		try {
			const { stdout } = await execa(this.gitBin, [
				"--git-dir",
				repoPath,
				"rev-list",
				"--count",
				resolvedRef,
			]);
			return Number.parseInt(stdout.trim(), 10);
		} catch {
			return 0;
		}
	}

	async getCommit(name: string, sha: string): Promise<CommitDetail> {
		validateName(name);
		validateSha(sha);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const fullSha = await revParse(this.gitBin, repoPath, sha);

		const { stdout } = await execa(this.gitBin, [
			"--git-dir",
			repoPath,
			"show",
			"--no-patch",
			`--format=${EXTENDED_LOG_FORMAT}`,
			fullSha,
		]);

		const line = stdout.trim();
		if (!line) throw new Error(`Commit "${sha}" not found`);

		const parts = line.split("\0");
		const [
			shaOut,
			shortSha,
			authorName,
			authorEmail,
			authoredAt,
			committedAt,
			subject,
			parentStr,
		] = parts;

		const parentSha =
			parentStr && parentStr.length > 0
				? (parentStr.split(" ")[0] ?? null)
				: null;

		return {
			sha: shaOut,
			shortSha,
			authorName,
			authorEmail,
			authoredAt: new Date(authoredAt),
			committedAt: new Date(committedAt),
			subject,
			parentSha,
		};
	}

	async getCommitDiff(name: string, sha: string): Promise<GetCommitDiffResult> {
		const commit = await this.getCommit(name, sha);
		const repoPath = resolvePath(this.storagePath, name);

		const { stdout: nameStatusStdout } = await execa(this.gitBin, [
			"--git-dir",
			repoPath,
			"diff-tree",
			"-r",
			"--name-status",
			"--root",
			"--no-commit-id",
			sha,
		]);
		const entries = parseNameStatus(nameStatusStdout);

		const files: DiffFile[] = entries.map((e) => ({
			oldPath: e.status === "added" ? null : e.oldPath,
			newPath: e.status === "deleted" ? null : e.newPath,
			status: e.status,
			hunks: [],
			isBinary: false,
		}));

		const { stdout: patchStdout } = await execa(this.gitBin, [
			"--git-dir",
			repoPath,
			"diff-tree",
			"-r",
			"-p",
			"--root",
			"--no-commit-id",
			sha,
		]);

		if (patchStdout) {
			const patchFiles = parseUnifiedDiff(patchStdout);
			for (const patchFile of patchFiles) {
				const matched = files.find(
					(f) =>
						(f.oldPath != null && f.oldPath === patchFile.oldPath) ||
						(f.newPath != null && f.newPath === patchFile.newPath),
				);
				if (matched) {
					matched.hunks = patchFile.hunks;
					matched.isBinary = patchFile.isBinary;
					if (patchFile.isBinary) {
						matched.hunks = [];
					}
				}
			}
		}

		return { commit, files };
	}

	async canMerge(
		name: string,
		head: string,
		base: string,
	): Promise<MergeStatus> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		if (!(await refExists(this.gitBin, repoPath, head))) {
			throw new Error(`Ref "${head}" not found in repository "${name}"`);
		}
		if (!(await refExists(this.gitBin, repoPath, base))) {
			throw new Error(`Ref "${base}" not found in repository "${name}"`);
		}

		const fastForward = await isAncestor(this.gitBin, repoPath, base, head);

		const result = await execa(
			this.gitBin,
			[
				"--git-dir",
				repoPath,
				"merge-tree",
				"--write-tree",
				"--name-only",
				"--no-messages",
				base,
				head,
			],
			{ reject: false },
		);

		const stdout = result.stdout ?? "";
		const lines = stdout
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.length > 0);
		const treeConflict = result.exitCode !== 0;

		let conflictingFiles: string[] = [];
		if (treeConflict) {
			conflictingFiles = lines
				.slice(1)
				.filter(
					(l) =>
						!l.startsWith("Auto-merging") &&
						!l.startsWith("CONFLICT") &&
						!l.startsWith("warning"),
				);
		}

		return { conflicts: treeConflict, fastForward, conflictingFiles };
	}

	async mergeBranch(
		name: string,
		head: string,
		base: string,
		options?: MergeOptions,
	): Promise<MergeResult> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		if (!(await refExists(this.gitBin, repoPath, head))) {
			throw new Error(`Ref "${head}" not found in repository "${name}"`);
		}
		if (!(await refExists(this.gitBin, repoPath, base))) {
			throw new Error(`Ref "${base}" not found in repository "${name}"`);
		}

		const headSha = await revParse(this.gitBin, repoPath, head);
		const baseSha = await revParse(this.gitBin, repoPath, base);

		const isFf = await isAncestor(this.gitBin, repoPath, base, head);

		const wantFf = options?.fastForward ?? false;

		if (isFf && wantFf) {
			await execa(this.gitBin, [
				"--git-dir",
				repoPath,
				"update-ref",
				`refs/heads/${base}`,
				headSha,
			]);
			return { mergedSha: headSha, fastForward: true };
		}

		const treeSha = await computeMergeTree(this.gitBin, repoPath, base, head);
		if (treeSha === null) {
			throw new Error(
				`Merge of "${head}" into "${base}" has conflicts and cannot be performed`,
			);
		}

		const message = options?.message ?? `Merge branch '${head}' into ${base}`;

		const { stdout: commitSha } = await execa(this.gitBin, [
			"--git-dir",
			repoPath,
			"commit-tree",
			treeSha,
			"-p",
			baseSha,
			"-p",
			headSha,
			"-m",
			message,
		]);

		const mergedSha = commitSha.trim();

		await execa(this.gitBin, [
			"--git-dir",
			repoPath,
			"update-ref",
			`refs/heads/${base}`,
			mergedSha,
		]);

		return { mergedSha, fastForward: false };
	}

	async advertiseRefs(
		name: string,
		service: GitService,
	): Promise<ReadableStream<Uint8Array>> {
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);
		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const cmdName = gitCommandName(service);
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
		validateName(name);
		const repoPath = resolvePath(this.storagePath, name);
		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		const cmdName = gitCommandName(service);
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
}

export const gitProvider: GitProvider = new CliGitProvider();
