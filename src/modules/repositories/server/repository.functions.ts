import { createServerFn } from "@tanstack/react-start";
import { gitProvider } from "#/modules/git";
import {
	countRepositoryCommits,
	createRepository,
	createRepositoryBranch,
	listRepositories,
	listRepositoryBranches,
	listRepositoryCommits,
	listRepositoryFiles,
} from "../repository.service";
import {
	countCommitsSchema,
	createBranchSchema,
	createRepositorySchema,
	listBranchesSchema,
	listCommitsSchema,
	listFilesSchema,
} from "../schemas";

export const listRepositoriesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		return listRepositories(gitProvider);
	},
);

export const createRepositoryFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createRepositorySchema.parse(data))
	.handler(async ({ data }) => {
		return createRepository(gitProvider, data);
	});

export const listRepositoryFilesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listFilesSchema.parse(data))
	.handler(async ({ data }) => {
		return listRepositoryFiles(gitProvider, data.name, data.path, data.ref);
	});

export const listBranchesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listBranchesSchema.parse(data))
	.handler(async ({ data }) => {
		return listRepositoryBranches(gitProvider, data.name);
	});

export const createBranchFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createBranchSchema.parse(data))
	.handler(async ({ data }) => {
		return createRepositoryBranch(
			gitProvider,
			data.name,
			data.branch,
			data.from,
		);
	});

export const listCommitsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listCommitsSchema.parse(data))
	.handler(async ({ data }) => {
		return listRepositoryCommits(gitProvider, data.name, data.ref, data.limit);
	});

export const countCommitsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => countCommitsSchema.parse(data))
	.handler(async ({ data }) => {
		return countRepositoryCommits(gitProvider, data.name, data.ref);
	});
