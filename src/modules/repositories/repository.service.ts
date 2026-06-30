import type { GitProvider, TreeEntry } from "#/modules/git";
import type { CreateRepositoryInput, Repository } from "./schemas";

export async function createRepository(
	gitProvider: GitProvider,
	input: CreateRepositoryInput,
): Promise<Repository> {
	return gitProvider.init(input.name, input.description);
}

export async function listRepositories(
	gitProvider: GitProvider,
): Promise<Repository[]> {
	return gitProvider.list();
}

export async function listRepositoryFiles(
	gitProvider: GitProvider,
	name: string,
	path?: string,
): Promise<TreeEntry[]> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.listFiles(name, { path });
}
