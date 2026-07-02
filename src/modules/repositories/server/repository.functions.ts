import { createServerFn } from "@tanstack/react-start";
import { assertSameOriginFn } from "#/modules/auth";
import { gitProvider } from "#/modules/git";
import {
	createRepositoryAccessFn,
	deleteRepositoryAccessFn,
	filterAccessibleRepositoriesFn,
	getRepositoryAccessFn,
	organizationNameSchema,
	requireOrganizationPermissionFn,
	requireRepositoryPermissionFn,
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

const requireRepository = (
	organizationName: string,
	repositoryName: string,
	permission: "read" | "write" | "manageAccess" | "delete",
) =>
	requireRepositoryPermissionFn({
		data: { organizationName, repositoryName, permission },
	});

async function addOwnerId<T extends { organizationName: string; name: string }>(
	repository: T,
): Promise<T & { ownerId?: string }> {
	const access = await getRepositoryAccessFn({
		data: {
			organizationName: repository.organizationName,
			repositoryName: repository.name,
		},
	});
	return access.ownerId
		? { ...repository, ownerId: access.ownerId }
		: repository;
}

export const listRepositoriesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		await requireOrganizationPermissionFn({
			data: { organizationName: data, permission: "read" },
		});
		const repositories = await listRepositories(gitProvider, data);
		const accessibleNames = await filterAccessibleRepositoriesFn({
			data: {
				organizationName: data,
				repositoryNames: repositories.map((repository) => repository.name),
			},
		});
		const accessible = new Set(accessibleNames);
		return Promise.all(
			repositories
				.filter((repository) => accessible.has(repository.name))
				.map(addOwnerId),
		);
	});

export const getRepositoryFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listBranchesSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.name, "read");
		return addOwnerId(await getRepository(gitProvider, locator(data)));
	});

export const createRepositoryFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createRepositorySchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganizationPermissionFn({
			data: {
				organizationName: data.organizationName,
				permission: "createRepository",
			},
		});
		const repository = await createRepository(gitProvider, data);
		try {
			const access = await createRepositoryAccessFn({
				data: {
					organizationName: data.organizationName,
					repositoryName: data.name,
				},
			});
			return { ...repository, ownerId: access.ownerId };
		} catch (error) {
			await gitProvider.delete(locator(data));
			throw error;
		}
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

async function deleteRepositoryWithAccess(data: {
	organizationName: string;
	name: string;
}): Promise<void> {
	await deleteRepository(gitProvider, pullRequestDataDeleter, locator(data));
	await deleteRepositoryAccessFn({
		data: {
			organizationName: data.organizationName,
			repositoryName: data.name,
		},
	});
}

export const deleteRepositoryFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => deleteRepositorySchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.name, "delete");
		await deleteRepositoryWithAccess(data);
	});

export const deleteRepositoryApiFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => repositoryLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.name, "delete");
		await deleteRepositoryWithAccess(data);
	});

export const deleteOrganizationRepositoriesFn = createServerFn({
	method: "POST",
})
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganizationPermissionFn({
			data: { organizationName: data, permission: "deleteOrganization" },
		});
		const repositories = await listRepositories(gitProvider, data);
		for (const repository of repositories) {
			await deleteRepositoryWithAccess({
				organizationName: data,
				name: repository.name,
			});
		}
	});

export const listRepositoryFilesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listFilesSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.name, "read");
		return listRepositoryFiles(gitProvider, locator(data), data.path, data.ref);
	});

export const getRepositoryFileFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getFileSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.name, "read");
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
		await requireRepository(data.organizationName, data.name, "read");
		return listRepositoryBranches(gitProvider, locator(data));
	});

export const createBranchFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createBranchSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.name, "write");
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
		await requireRepository(data.organizationName, data.name, "read");
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
		await requireRepository(data.organizationName, data.name, "read");
		return countRepositoryCommits(gitProvider, locator(data), data.ref);
	});

export const getCommitFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getCommitDiffSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.name, "read");
		return getRepositoryCommit(gitProvider, locator(data), data.sha);
	});

export const getCommitDiffFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getCommitDiffSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.name, "read");
		return getRepositoryCommitDiff(gitProvider, locator(data), data.sha);
	});
