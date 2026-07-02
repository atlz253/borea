import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { type ExecaError, execa } from "execa";
import { getConfig } from "#/platform/config";
import { NotFoundError } from "#/platform/errors";
import type {
	BranchInfo,
	CommitDetail,
	CommitInfo,
	DiffFile,
	GetCommitDiffResult,
	GetFileOptions,
	GitProvider,
	GitService,
	ListCommitsOptions,
	ListFilesOptions,
	MergeOptions,
	MergeResult,
	MergeStatus,
	RepositoryInfo,
	RepositoryLocator,
	TreeEntry,
} from "../git-provider";
import { readCommitDiff } from "./cli-git-commit-diff";
import { readFileContent } from "./cli-git-file";
import {
	computeDiff,
	computeMergeTree,
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
} from "./cli-git-parsers";
import { readRepositoryInfo } from "./cli-git-repository";
import {
	advertiseRefs as advertiseRepositoryRefs,
	invokeService as invokeRepositoryService,
} from "./cli-git-transport";
import {
	normalizePath,
	resolvePath,
	validateName,
	validateSha,
} from "./cli-git-validators";

type RepositoryTarget = RepositoryLocator | string;

export class CliGitProvider implements GitProvider {
	private readonly storagePath: string;
	private readonly gitBin: string;
	constructor(storagePath?: string, gitBin?: string) {
		const cfg = getConfig();
		this.storagePath = storagePath ?? cfg.storagePath;
		this.gitBin = gitBin ?? cfg.gitBinPath;
	}

	async init(
		locator: RepositoryTarget,
		description?: string,
	): Promise<RepositoryInfo> {
		const { organizationName, repositoryName: name } =
			this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

		if (existsSync(repoPath)) {
			throw new Error(`Repository "${name}" already exists`);
		}
		await mkdir(path.dirname(repoPath), { recursive: true });
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

		return readRepositoryInfo(organizationName, name, repoPath);
	}

	async delete(locator: RepositoryTarget): Promise<void> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new NotFoundError(`Repository "${name}" not found`);
		}

		await rm(repoPath, { recursive: true });
	}

	async list(organizationName?: string): Promise<RepositoryInfo[]> {
		try {
			const organizationPath = organizationName
				? path.join(this.storagePath, organizationName)
				: this.storagePath;
			await mkdir(organizationPath, { recursive: true });
			const entries = await readdir(organizationPath, { withFileTypes: true });
			const repos: RepositoryInfo[] = [];

			for (const entry of entries) {
				if (!entry.isDirectory()) {
					continue;
				}
				const repoPath = path.join(organizationPath, entry.name);
				if (existsSync(path.join(repoPath, "HEAD"))) {
					repos.push(
						await readRepositoryInfo(
							organizationName ?? "default",
							entry.name,
							repoPath,
						),
					);
				}
			}

			repos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			return repos;
		} catch {
			return [];
		}
	}

	async get(locator: RepositoryTarget): Promise<RepositoryInfo | undefined> {
		const { organizationName, repositoryName: name } =
			this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);
		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			return undefined;
		}
		return readRepositoryInfo(organizationName, name, repoPath);
	}

	async exists(locator: RepositoryTarget): Promise<boolean> {
		const repoPath = this.resolveTargetPath(locator);
		return existsSync(repoPath) && existsSync(path.join(repoPath, "HEAD"));
	}

	async listFiles(
		locator: RepositoryTarget,
		options?: ListFilesOptions,
	): Promise<TreeEntry[]> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

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

	async getFile(locator: RepositoryTarget, options: GetFileOptions) {
		return readFileContent(
			this.gitBin,
			this.storagePath,
			this.normalizeTarget(locator),
			options,
			typeof locator === "string",
		);
	}

	async createBranch(
		locator: RepositoryTarget,
		branch: string,
		fromRef?: string,
	): Promise<BranchInfo> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

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

	async listBranches(locator: RepositoryTarget): Promise<BranchInfo[]> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

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
		locator: RepositoryTarget,
		options?: ListCommitsOptions,
	): Promise<CommitInfo[]> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

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

	async countCommits(locator: RepositoryTarget, ref?: string): Promise<number> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

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

	async getCommit(
		locator: RepositoryTarget,
		sha: string,
	): Promise<CommitDetail> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		validateSha(sha);
		const repoPath = this.resolveTargetPath(locator);

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

	async getCommitDiff(
		locator: RepositoryTarget,
		sha: string,
	): Promise<GetCommitDiffResult> {
		const commit = await this.getCommit(locator, sha);
		const repoPath = this.resolveTargetPath(locator);
		return readCommitDiff(this.gitBin, repoPath, sha, commit);
	}

	async getDiff(
		locator: RepositoryTarget,
		base: string,
		head: string,
	): Promise<DiffFile[]> {
		return computeDiff(
			this.gitBin,
			this.storagePath,
			this.normalizeTarget(locator),
			base,
			head,
			typeof locator === "string",
		);
	}

	async canMerge(
		locator: RepositoryTarget,
		head: string,
		base: string,
	): Promise<MergeStatus> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

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
		locator: RepositoryTarget,
		head: string,
		base: string,
		options?: MergeOptions,
	): Promise<MergeResult> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);

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
		locator: RepositoryTarget,
		service: GitService,
	): Promise<ReadableStream<Uint8Array>> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);
		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		return advertiseRepositoryRefs(this.gitBin, repoPath, service);
	}

	async invokeService(
		locator: RepositoryTarget,
		service: GitService,
		input: ReadableStream<Uint8Array>,
	): Promise<ReadableStream<Uint8Array>> {
		const { repositoryName: name } = this.normalizeTarget(locator);
		validateName(name);
		const repoPath = this.resolveTargetPath(locator);
		if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
			throw new Error(`Repository "${name}" not found`);
		}

		return invokeRepositoryService(this.gitBin, repoPath, service, input);
	}

	private normalizeTarget(target: RepositoryTarget): RepositoryLocator {
		if (typeof target === "string") {
			return {
				organizationName: "default",
				repositoryName: target,
			};
		}
		return target;
	}

	private resolveTargetPath(target: RepositoryTarget): string {
		if (typeof target === "string") {
			return path.resolve(this.storagePath, target);
		}
		return resolvePath(
			this.storagePath,
			target.organizationName,
			target.repositoryName,
		);
	}
}
export const gitProvider: GitProvider = new CliGitProvider();
