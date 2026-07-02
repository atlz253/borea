import { execa } from "execa";
import type {
	CommitDetail,
	DiffFile,
	GetCommitDiffResult,
} from "../git-provider";
import { parseNameStatus, parseUnifiedDiff } from "./cli-git-parsers";

export async function readCommitDiff(
	gitBin: string,
	repositoryPath: string,
	sha: string,
	commit: CommitDetail,
): Promise<GetCommitDiffResult> {
	const { stdout: nameStatusOutput } = await execa(gitBin, [
		"--git-dir",
		repositoryPath,
		"diff-tree",
		"-r",
		"--name-status",
		"--root",
		"--no-commit-id",
		sha,
	]);
	const files: DiffFile[] = parseNameStatus(nameStatusOutput).map((entry) => ({
		oldPath: entry.status === "added" ? null : entry.oldPath,
		newPath: entry.status === "deleted" ? null : entry.newPath,
		status: entry.status,
		hunks: [],
		isBinary: false,
	}));

	const { stdout: patchOutput } = await execa(gitBin, [
		"--git-dir",
		repositoryPath,
		"diff-tree",
		"-r",
		"-p",
		"--root",
		"--no-commit-id",
		sha,
	]);
	for (const patchFile of parseUnifiedDiff(patchOutput)) {
		const matched = files.find(
			(file) =>
				(file.oldPath !== null && file.oldPath === patchFile.oldPath) ||
				(file.newPath !== null && file.newPath === patchFile.newPath),
		);
		if (matched) {
			matched.hunks = patchFile.isBinary ? [] : patchFile.hunks;
			matched.isBinary = patchFile.isBinary;
		}
	}
	return { commit, files };
}
