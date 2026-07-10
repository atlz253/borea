import { createServerFn } from "@tanstack/react-start";
import {
	assertSameOriginFn,
	getUserByUsernameFn,
	requireCurrentUserFn,
	usernameSchema,
} from "#/modules/auth";
import { gitProvider, type RepositoryLocator } from "#/modules/git";
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
import { PrismaDatabaseProvider } from "#/platform/database";
import { ForbiddenError, NotFoundError } from "#/platform/errors";
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
	listUserRepositories,
	renameRepositoryBranch,
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
	renameBranchSchema,
	repositoryLocatorSchema,
} from "../schemas";

const prismaDb = new PrismaDatabaseProvider();

const locator = (data: {
	organizationName?: string;
	userName?: string;
	name: string;
}): RepositoryLocator =>
	data.userName
		? { userName: data.userName, repositoryName: data.name }
		: {
				organizationName: data.organizationName ?? "default",
				repositoryName: data.name,
			};

const requireRepository = (
	organizationName: string | undefined,
	userName: string | undefined,
	repositoryName: string,
	permission: "read" | "write" | "manageAccess" | "delete",
) => {
	if (userName) {
		return requireUserRepository(userName, repositoryName, permission);
	}
	return requireRepositoryPermissionFn({
		data: {
			organizationName: organizationName ?? "default",
			repositoryName,
			permission,
		},
	});
};

async function requireUserRepository(
	userName: string,
	repositoryName: string,
	_permission: "read" | "write" | "manageAccess" | "delete",
) {
	const [currentUser, namespaceUser] = await Promise.all([
		requireCurrentUserFn(),
		getUserByUsernameFn({ data: { username: userName } }),
	]);
	if (!namespaceUser || namespaceUser.id !== currentUser.id) {
		throw new NotFoundError(`Repository "${repositoryName}" not found`);
	}
	const repository = await prismaDb.getClient().repository.findFirst({
		where: { userId: namespaceUser.id, name: repositoryName },
	});
	if (!repository) {
		throw new NotFoundError(`Repository "${repositoryName}" not found`);
	}
	return {
		ownerId: repository.ownerId,
		isOwner: true,
		canRead: true,
		canWrite: true,
		canManageAccess: false,
		canAssignRepositoryModerator: false,
		canDelete: true,
	};
}

async function createUserRepositoryAccess(
	userName: string,
	repositoryName: string,
) {
	const currentUser = await requireCurrentUserFn();
	if (currentUser.username !== userName) {
		throw new ForbiddenError("You cannot create repositories for this user");
	}
	const id = `users/${userName}/${repositoryName}`;
	const now = new Date().toISOString();
	await prismaDb.getClient().repository.create({
		data: {
			id,
			userId: currentUser.id,
			name: repositoryName,
			createdAt: now,
			ownerId: currentUser.id,
		},
	});
	await prismaDb.getClient().pullRequestCounter.create({
		data: { repositoryId: id, lastNumber: 0 },
	});
	return { ownerId: currentUser.id, createdAt: now };
}

async function addOwnerId<
	T extends { organizationName?: string; userName?: string; name: string },
>(repository: T): Promise<T & { ownerId?: string }> {
	if (repository.userName) {
		const user = await getUserByUsernameFn({
			data: { username: repository.userName },
		});
		const access = user
			? await prismaDb.getClient().repository.findFirst({
					where: { userId: user.id, name: repository.name },
				})
			: undefined;
		return access?.ownerId
			? { ...repository, ownerId: access.ownerId }
			: repository;
	}
	if (!repository.organizationName) return repository;
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
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
		return addOwnerId(await getRepository(gitProvider, locator(data)));
	});

export const createRepositoryFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createRepositorySchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		if (data.userName) {
			const repository = await createRepository(gitProvider, data);
			try {
				const access = await createUserRepositoryAccess(
					data.userName,
					data.name,
				);
				return { ...repository, ownerId: access.ownerId };
			} catch (error) {
				await gitProvider.delete(locator(data));
				throw error;
			}
		}
		await requireOrganizationPermissionFn({
			data: {
				organizationName: data.organizationName ?? "default",
				permission: "createRepository",
			},
		});
		const organizationName = data.organizationName ?? "default";
		const repository = await createRepository(gitProvider, {
			...data,
			organizationName,
		});
		try {
			const access = await createRepositoryAccessFn({
				data: {
					organizationName,
					repositoryName: data.name,
				},
			});
			return { ...repository, ownerId: access.ownerId };
		} catch (error) {
			await gitProvider.delete(locator({ ...data, organizationName }));
			throw error;
		}
	});

const pullRequestDataDeleter = {
	async deleteAll(repositoryLocator: {
		organizationName?: string;
		userName?: string;
		repositoryName: string;
	}): Promise<void> {
		if (repositoryLocator.organizationName) {
			await deletePullRequestsForRepositoryFn({
				data: {
					organizationName: repositoryLocator.organizationName,
					repoName: repositoryLocator.repositoryName,
				},
			});
		}
	},
};

async function deleteRepositoryWithAccess(data: {
	organizationName?: string;
	userName?: string;
	name: string;
}): Promise<void> {
	await deleteRepository(gitProvider, pullRequestDataDeleter, locator(data));
	if (data.userName) {
		const user = await getUserByUsernameFn({
			data: { username: data.userName },
		});
		if (user) {
			await prismaDb.getClient().repository.delete({
				where: { id: `users/${data.userName}/${data.name}` },
			});
		}
		return;
	}
	const organizationName = data.organizationName ?? "default";
	await deleteRepositoryAccessFn({
		data: {
			organizationName,
			repositoryName: data.name,
		},
	});
}

export const deleteRepositoryFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => deleteRepositorySchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"delete",
		);
		await deleteRepositoryWithAccess(data);
	});

export const deleteRepositoryApiFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => repositoryLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"delete",
		);
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
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
		return listRepositoryFiles(gitProvider, locator(data), data.path, data.ref);
	});

export const getRepositoryFileFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getFileSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
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
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
		return listRepositoryBranches(gitProvider, locator(data));
	});

export const createBranchFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createBranchSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"write",
		);
		return createRepositoryBranch(
			gitProvider,
			locator(data),
			data.branch,
			data.from,
		);
	});

export const renameBranchFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => renameBranchSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"write",
		);
		return renameRepositoryBranch(
			gitProvider,
			locator(data),
			data.oldName,
			data.newName,
		);
	});

export const listCommitsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listCommitsSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
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
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
		return countRepositoryCommits(gitProvider, locator(data), data.ref);
	});

export const getCommitFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getCommitDiffSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
		return getRepositoryCommit(gitProvider, locator(data), data.sha);
	});

export const getCommitDiffFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getCommitDiffSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(
			data.organizationName,
			data.userName,
			data.name,
			"read",
		);
		return getRepositoryCommitDiff(gitProvider, locator(data), data.sha);
	});

export const listUserRepositoriesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		usernameSchema.parse(
			(data as { userName?: unknown; username?: unknown }).userName ??
				(data as { userName?: unknown; username?: unknown }).username,
		),
	)
	.handler(async ({ data }) => {
		const userName = String(data);
		const currentUser = await requireCurrentUserFn();
		if (currentUser.username !== userName) {
			throw new NotFoundError(`User "${userName}" not found`);
		}
		const repositories = await listUserRepositories(gitProvider, userName);
		return Promise.all(repositories.map(addOwnerId));
	});

export const getUserRepositoryAccessFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => repositoryLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		if (!data.userName) {
			throw new NotFoundError(`Repository "${data.name}" not found`);
		}
		return requireUserRepository(data.userName, data.name, "read");
	});
