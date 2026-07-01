import type {
	BranchInfo,
	CommitDetail,
	CommitInfo,
	FileContent,
	GetCommitDiffResult,
	GitProvider,
	TreeEntry,
} from "#/modules/git";
import { NotFoundError } from "#/platform/errors";
import type { CreateRepositoryInput, Repository } from "./schemas";

interface PullRequestDataDeleter {
	deleteAll(repoName: string): Promise<void>;
}

export async function createRepository(
	gitProvider: GitProvider,
	input: CreateRepositoryInput,
): Promise<Repository> {
	return gitProvider.init(input.name, input.description);
}

export async function deleteRepository(
	gitProvider: GitProvider,
	pullRequestDataDeleter: PullRequestDataDeleter,
	name: string,
): Promise<void> {
	await gitProvider.delete(name);
	await pullRequestDataDeleter.deleteAll(name);
}

export async function listRepositories(
	gitProvider: GitProvider,
): Promise<Repository[]> {
	return gitProvider.list();
}

export async function getRepository(
	gitProvider: GitProvider,
	name: string,
): Promise<Repository> {
	const repository = await gitProvider.get(name);
	if (!repository) {
		throw new NotFoundError(`Repository "${name}" not found`);
	}
	return repository;
}

export async function listRepositoryFiles(
	gitProvider: GitProvider,
	name: string,
	path?: string,
	ref?: string,
): Promise<TreeEntry[]> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.listFiles(name, { path, ref });
}

export async function getRepositoryFile(
	gitProvider: GitProvider,
	name: string,
	path: string,
	ref: string | undefined,
	maxBytes: number,
): Promise<FileContent> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.getFile(name, { path, ref, maxBytes });
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

export async function createRepositoryBranch(
	gitProvider: GitProvider,
	name: string,
	branch: string,
	fromRef?: string,
): Promise<BranchInfo> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.createBranch(name, branch, fromRef);
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

export async function getRepositoryCommit(
	gitProvider: GitProvider,
	name: string,
	sha: string,
): Promise<CommitDetail> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.getCommit(name, sha);
}

export async function getRepositoryCommitDiff(
	gitProvider: GitProvider,
	name: string,
	sha: string,
): Promise<GetCommitDiffResult> {
	if (!(await gitProvider.exists(name))) {
		throw new Error(`Repository "${name}" not found`);
	}
	return gitProvider.getCommitDiff(name, sha);
}
