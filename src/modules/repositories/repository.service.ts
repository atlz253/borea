import type {
	BranchInfo,
	CommitDetail,
	CommitInfo,
	FileContent,
	GetCommitDiffResult,
	GitProvider,
	RepositoryLocator,
	TreeEntry,
} from "#/modules/git";
import { NotFoundError } from "#/platform/errors";
import type { CreateRepositoryInput, Repository } from "./schemas";

interface PullRequestDataDeleter {
	deleteAll(locator: RepositoryLocator): Promise<void>;
}

type RepositoryTarget = RepositoryLocator | string;

function repositoryName(target: RepositoryTarget): string {
	return typeof target === "string" ? target : target.repositoryName;
}

function targetFromInput(input: CreateRepositoryInput): RepositoryLocator {
	if (input.userName) {
		return { userName: input.userName, repositoryName: input.name };
	}
	return {
		organizationName: input.organizationName ?? "default",
		repositoryName: input.name,
	};
}

function scopeFromLocator(locator: RepositoryLocator | string): {
	organizationName?: string;
	userName?: string;
} {
	if (typeof locator === "string") {
		return { organizationName: "default" };
	}
	if ("userName" in locator) {
		return { userName: locator.userName };
	}
	return { organizationName: locator.organizationName };
}

export async function createRepository(
	gitProvider: GitProvider,
	input: CreateRepositoryInput | { name: string; description?: string },
): Promise<Repository> {
	const locator =
		"organizationName" in input || "userName" in input
			? targetFromInput(input as CreateRepositoryInput)
			: input.name;
	const repository = await gitProvider.init(locator, input.description);
	return { ...repository, ...scopeFromLocator(locator) };
}

export async function deleteRepository(
	gitProvider: GitProvider,
	pullRequestDataDeleter: PullRequestDataDeleter,
	locator: RepositoryTarget,
): Promise<void> {
	await pullRequestDataDeleter.deleteAll(locator as RepositoryLocator);
	await gitProvider.delete(locator as RepositoryLocator);
}

export async function listRepositories(
	gitProvider: GitProvider,
	organizationName?: string,
): Promise<Repository[]> {
	const repositories = organizationName
		? await gitProvider.list(organizationName)
		: await gitProvider.list();
	return repositories.map((repository) => ({
		...repository,
		organizationName:
			repository.organizationName ?? organizationName ?? "default",
	}));
}

export async function listUserRepositories(
	gitProvider: GitProvider,
	userName: string,
): Promise<Repository[]> {
	const repositories = await gitProvider.list(`users/${userName}`);
	return repositories.map((repository) => ({
		...repository,
		organizationName: undefined,
		userName,
	}));
}

export async function getRepository(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
): Promise<Repository> {
	const repository = await gitProvider.get(locator as RepositoryLocator);
	if (!repository) {
		throw new NotFoundError(
			`Repository "${repositoryName(locator)}" not found`,
		);
	}
	return {
		...repository,
		...scopeFromLocator(locator),
	};
}

export async function listRepositoryFiles(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	path?: string,
	ref?: string,
): Promise<TreeEntry[]> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.listFiles(locator as RepositoryLocator, { path, ref });
}

export async function getRepositoryFile(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	path: string,
	ref: string | undefined,
	maxBytes: number,
): Promise<FileContent> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.getFile(locator as RepositoryLocator, {
		path,
		ref,
		maxBytes,
	});
}

export async function listRepositoryBranches(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
): Promise<BranchInfo[]> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.listBranches(locator as RepositoryLocator);
}

export async function listRepositoryCommits(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	ref?: string,
	limit?: number,
): Promise<CommitInfo[]> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.listCommits(locator as RepositoryLocator, { ref, limit });
}

export async function createRepositoryBranch(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	branch: string,
	fromRef?: string,
): Promise<BranchInfo> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.createBranch(
		locator as RepositoryLocator,
		branch,
		fromRef,
	);
}

export async function renameRepositoryBranch(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	oldName: string,
	newName: string,
): Promise<BranchInfo> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.renameBranch(
		locator as RepositoryLocator,
		oldName,
		newName,
	);
}

export async function countRepositoryCommits(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	ref?: string,
): Promise<number> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.countCommits(locator as RepositoryLocator, ref);
}

export async function getRepositoryCommit(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	sha: string,
): Promise<CommitDetail> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.getCommit(locator as RepositoryLocator, sha);
}

export async function getRepositoryCommitDiff(
	gitProvider: GitProvider,
	locator: RepositoryTarget,
	sha: string,
): Promise<GetCommitDiffResult> {
	if (!(await gitProvider.exists(locator as RepositoryLocator))) {
		throw new Error(`Repository "${repositoryName(locator)}" not found`);
	}
	return gitProvider.getCommitDiff(locator as RepositoryLocator, sha);
}
