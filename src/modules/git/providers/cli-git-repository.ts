import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { RepositoryInfo } from "../git-provider";
import { DEFAULT_DESC } from "./cli-git-validators";

export async function readRepositoryInfo(
	organizationName: string,
	name: string,
	repoPath: string,
): Promise<RepositoryInfo> {
	let description: string | undefined;

	try {
		const content = await readFile(path.join(repoPath, "description"), "utf-8");
		const trimmed = content.trim();
		if (trimmed && trimmed !== DEFAULT_DESC) {
			description = trimmed;
		}
	} catch {}

	const stats = await stat(repoPath);
	return {
		organizationName,
		name,
		description,
		createdAt: stats.birthtime ?? stats.mtime,
	};
}
