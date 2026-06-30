import { createServerFn } from "@tanstack/react-start";
import { gitProvider } from "#/modules/git";
import { createRepository, listRepositories } from "../repository.service";
import { createRepositorySchema } from "../schemas";

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
