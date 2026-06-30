import { execa } from "execa";
import type { GitService } from "../git-provider";

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
