import type {
	BranchInfo,
	CommitInfo,
	GitProvider,
	TreeEntry,
} from "#/modules/git";
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

export async function listRepositoryBranches(
	gitProvider: GitProvider,
	name: string,
): Promise<BranchInfo[]> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.listBranches(name);
}

export async function listRepositoryCommits(
	gitProvider: GitProvider,
	name: string,
	ref?: string,
	limit?: number,
): Promise<CommitInfo[]> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.listCommits(name, { ref, limit });
}

export async function countRepositoryCommits(
	gitProvider: GitProvider,
	name: string,
	ref?: string,
): Promise<number> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.countCommits(name, ref);
}
