import { existsSync } from "node:fs";
import path from "node:path";
import { execa } from "execa";
import type { DiffFile, GitService, RepositoryLocator } from "../git-provider";
import { parseNameStatus, parseUnifiedDiff } from "./cli-git-parsers";
import { resolvePath, validateName } from "./cli-git-validators";

export async function computeMergeTree(
	gitBin: string,
	repoPath: string,
	base: string,
	head: string,
): Promise<string | null> {
	const result = await execa(
		gitBin,
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

	if (result.exitCode !== 0) {
		return null;
	}

	const lines = (result.stdout ?? "")
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	if (lines.length === 0) {
		return null;
	}

	return lines[0];
}

export async function mergeBase(
	gitBin: string,
	repoPath: string,
	base: string,
	head: string,
): Promise<string> {
	const { stdout } = await execa(gitBin, [
		"--git-dir",
		repoPath,
		"merge-base",
		base,
		head,
	]);
	return stdout.trim();
}

export async function isAncestor(
	gitBin: string,
	repoPath: string,
	ancestor: string,
	descendant: string,
): Promise<boolean> {
	try {
		await execa(gitBin, [
			"--git-dir",
			repoPath,
			"merge-base",
			"--is-ancestor",
			ancestor,
			descendant,
		]);
		return true;
	} catch {
		return false;
	}
}

export async function revParse(
	gitBin: string,
	repoPath: string,
	ref: string,
): Promise<string> {
	const { stdout } = await execa(gitBin, [
		"--git-dir",
		repoPath,
		"rev-parse",
		"--verify",
		ref,
	]);
	return stdout.trim();
}

export async function refExists(
	gitBin: string,
	repoPath: string,
	ref: string,
): Promise<boolean> {
	try {
		await execa(gitBin, [
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

export function gitCommandName(service: GitService): string {
	switch (service) {
		case "git-upload-pack":
			return "upload-pack";
		case "git-receive-pack":
			return "receive-pack";
	}
}

export async function computeDiff(
	gitBin: string,
	storagePath: string,
	locator: RepositoryLocator,
	base: string,
	head: string,
	legacy = false,
): Promise<DiffFile[]> {
	const name = locator.repositoryName;
	validateName(name);
	const repoPath = legacy
		? path.resolve(storagePath, name)
		: resolvePath(storagePath, locator.organizationName, name);

	if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
		throw new Error(`Repository "${name}" not found`);
	}

	if (!(await refExists(gitBin, repoPath, base))) {
		throw new Error(`Ref "${base}" not found in repository "${name}"`);
	}
	if (!(await refExists(gitBin, repoPath, head))) {
		throw new Error(`Ref "${head}" not found in repository "${name}"`);
	}

	const mergeBaseSha = await mergeBase(gitBin, repoPath, base, head);

	const { stdout: nameStatusStdout } = await execa(gitBin, [
		"--git-dir",
		repoPath,
		"diff-tree",
		"-r",
		"--name-status",
		mergeBaseSha,
		head,
	]);
	const entries = parseNameStatus(nameStatusStdout);

	const files: DiffFile[] = entries.map((e) => ({
		oldPath: e.status === "added" ? null : e.oldPath,
		newPath: e.status === "deleted" ? null : e.newPath,
		status: e.status,
		hunks: [],
		isBinary: false,
	}));

	const { stdout: patchStdout } = await execa(gitBin, [
		"--git-dir",
		repoPath,
		"diff-tree",
		"-r",
		"-p",
		mergeBaseSha,
		head,
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

	return files;
}
