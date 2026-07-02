import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { organizationNameSchema } from "#/modules/organizations";
import { apiErrorSchema } from "#/platform/http";
import { repoNameSchema, repositoryResponseSchema } from "./schemas";

const jsonContent = (schema: z.ZodType) => ({
	"application/json": { schema },
});

export function registerRepositoryOpenApi(registry: OpenAPIRegistry): void {
	const repository = registry.register("Repository", repositoryResponseSchema);
	const repositoryList = registry.register(
		"RepositoryList",
		z.array(repositoryResponseSchema),
	);
	const error = registry.register("ApiError", apiErrorSchema);
	const organizationParams = z.object({
		organization: organizationNameSchema,
	});
	const params = organizationParams.extend({
		repository: repoNameSchema,
	});

	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}/repositories",
		tags: ["Repositories"],
		summary: "List repositories",
		request: { params: organizationParams },
		responses: {
			200: {
				description: "Repository list",
				content: jsonContent(repositoryList),
			},
			500: {
				description: "Internal server error",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}/repositories/{repository}",
		tags: ["Repositories"],
		summary: "Get repository",
		request: { params },
		responses: {
			200: {
				description: "Repository data",
				content: jsonContent(repository),
			},
			400: {
				description: "Invalid repository name",
				content: jsonContent(error),
			},
			404: {
				description: "Repository not found",
				content: jsonContent(error),
			},
			500: {
				description: "Internal server error",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "delete",
		path: "/api/v1/organizations/{organization}/repositories/{repository}",
		tags: ["Repositories"],
		summary: "Delete repository",
		request: { params },
		responses: {
			204: { description: "Repository deleted" },
			400: {
				description: "Invalid repository name",
				content: jsonContent(error),
			},
			404: {
				description: "Repository not found",
				content: jsonContent(error),
			},
			500: {
				description: "Internal server error",
				content: jsonContent(error),
			},
		},
	});
}
