import type { GitProvider } from "#/modules/git";
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
