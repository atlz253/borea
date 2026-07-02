import { createServerFn } from "@tanstack/react-start";
import { assertSameOriginFn } from "#/modules/auth";
import { gitProvider } from "#/modules/git";
import {
	organizationNameSchema,
	requireOrganizationFn,
} from "#/modules/organizations";
import { deletePullRequestsForRepositoryFn } from "#/modules/pull-requests";
import { resolveFileReadLimit } from "../file-limits";
import {
	countRepositoryCommits,
	createRepository,
	createRepositoryBranch,
	deleteRepository,
	getRepository,
	getRepositoryCommit,
	getRepositoryCommitDiff,
	getRepositoryFile,
	listRepositories,
	listRepositoryBranches,
	listRepositoryCommits,
	listRepositoryFiles,
} from "../repository.service";
import {
	countCommitsSchema,
	createBranchSchema,
	createRepositorySchema,
	deleteRepositorySchema,
	getCommitDiffSchema,
	getFileSchema,
	listBranchesSchema,
	listCommitsSchema,
	listFilesSchema,
	repositoryLocatorSchema,
} from "../schemas";

const locator = (data: { organizationName: string; name: string }) => ({
	organizationName: data.organizationName,
	repositoryName: data.name,
});

const requireOrganization = (organizationName: string) =>
	requireOrganizationFn({ data: { organizationName } });

export const listRepositoriesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		await requireOrganization(data);
		return listRepositories(gitProvider, data);
	});

export const getRepositoryFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listBranchesSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return getRepository(gitProvider, locator(data));
	});

export const createRepositoryFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createRepositorySchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		return createRepository(gitProvider, data);
	});

const pullRequestDataDeleter = {
	async deleteAll(repositoryLocator: {
		organizationName: string;
		repositoryName: string;
	}): Promise<void> {
		await deletePullRequestsForRepositoryFn({
			data: {
				organizationName: repositoryLocator.organizationName,
				repoName: repositoryLocator.repositoryName,
			},
		});
	},
};

export const deleteRepositoryFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => deleteRepositorySchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		await deleteRepository(gitProvider, pullRequestDataDeleter, locator(data));
	});

export const deleteRepositoryApiFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => repositoryLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		await deleteRepository(gitProvider, pullRequestDataDeleter, locator(data));
	});

export const listRepositoryFilesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listFilesSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return listRepositoryFiles(gitProvider, locator(data), data.path, data.ref);
	});

export const getRepositoryFileFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getFileSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return getRepositoryFile(
			gitProvider,
			locator(data),
			data.path,
			data.ref,
			resolveFileReadLimit(data.loadLarge),
		);
	});

export const listBranchesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listBranchesSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return listRepositoryBranches(gitProvider, locator(data));
	});

export const createBranchFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createBranchSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		return createRepositoryBranch(
			gitProvider,
			locator(data),
			data.branch,
			data.from,
		);
	});

export const listCommitsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listCommitsSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return listRepositoryCommits(
			gitProvider,
			locator(data),
			data.ref,
			data.limit,
		);
	});

export const countCommitsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => countCommitsSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return countRepositoryCommits(gitProvider, locator(data), data.ref);
	});

export const getCommitFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getCommitDiffSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return getRepositoryCommit(gitProvider, locator(data), data.sha);
	});

export const getCommitDiffFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getCommitDiffSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return getRepositoryCommitDiff(gitProvider, locator(data), data.sha);
	});
