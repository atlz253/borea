import { createServerFn } from "@tanstack/react-start";
import { gitProvider } from "#/modules/git";
import {
	createRepository,
	listRepositories,
	listRepositoryFiles,
} from "../repository.service";
import { createRepositorySchema, listFilesSchema } from "../schemas";

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
		return listRepositoryFiles(gitProvider, data.name, data.path);
	});
