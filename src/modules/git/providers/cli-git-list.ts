import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import type { RepositoryInfo } from "../git-provider";
import { readRepositoryInfo } from "./cli-git-repository";

export async function listRepositories(
	storagePath: string,
	organizationName?: string,
): Promise<RepositoryInfo[]> {
	try {
		const organizationPath = organizationName
			? path.join(storagePath, organizationName)
			: storagePath;
		await mkdir(organizationPath, { recursive: true });
		const entries = await readdir(organizationPath, { withFileTypes: true });
		const org = organizationName ?? "default";
		const repos = (
			await Promise.all(
				entries
					.filter((entry) => entry.isDirectory())
					.map(async (entry) => {
						const repoPath = path.join(organizationPath, entry.name);
						if (!existsSync(path.join(repoPath, "HEAD"))) {
							return null;
						}
						return readRepositoryInfo(org, entry.name, repoPath);
					}),
			)
		).filter((r): r is RepositoryInfo => r !== null);
		repos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		return repos;
	} catch {
		return [];
	}
}
