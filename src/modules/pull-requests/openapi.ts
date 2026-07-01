import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { apiErrorSchema } from "#/platform/http";
import {
	mergePullRequestBodySchema,
	mergePullRequestResponseSchema,
	pullRequestSchema,
	repoNameSchema,
} from "./schemas";

const jsonContent = (schema: z.ZodType) => ({
	"application/json": { schema },
});

export function registerPullRequestOpenApi(registry: OpenAPIRegistry): void {
	const pullRequest = registry.register("PullRequest", pullRequestSchema);
	const pullRequestList = registry.register(
		"PullRequestList",
		z.array(pullRequestSchema),
	);
	const mergeResponse = registry.register(
		"MergePullRequestResponse",
		mergePullRequestResponseSchema,
	);
	const error = registry.register("PullRequestApiError", apiErrorSchema);
	const repositoryParams = z.object({ name: repoNameSchema });
	const pullRequestParams = repositoryParams.extend({
		pullId: z.coerce.number().int().positive(),
	});

	registry.registerPath({
		method: "get",
		path: "/api/v1/repositories/{name}/pull-requests",
		tags: ["Pull requests"],
		summary: "List pull requests",
		request: { params: repositoryParams },
		responses: {
			200: {
				description: "Pull request list",
				content: jsonContent(pullRequestList),
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
		method: "get",
		path: "/api/v1/repositories/{name}/pull-requests/{pullId}",
		tags: ["Pull requests"],
		summary: "Get pull request",
		request: { params: pullRequestParams },
		responses: {
			200: {
				description: "Pull request data",
				content: jsonContent(pullRequest),
			},
			400: {
				description: "Invalid path parameters",
				content: jsonContent(error),
			},
			404: {
				description: "Repository or pull request not found",
				content: jsonContent(error),
			},
			500: {
				description: "Internal server error",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "post",
		path: "/api/v1/repositories/{name}/pull-requests/{pullId}/merge",
		tags: ["Pull requests"],
		summary: "Merge pull request",
		request: {
			params: pullRequestParams,
			body: {
				required: false,
				content: jsonContent(mergePullRequestBodySchema),
			},
		},
		responses: {
			200: {
				description: "Pull request merged",
				content: jsonContent(mergeResponse),
			},
			400: {
				description: "Invalid path parameters or request body",
				content: jsonContent(error),
			},
			404: {
				description: "Repository or pull request not found",
				content: jsonContent(error),
			},
			409: {
				description: "Pull request cannot be merged",
				content: jsonContent(error),
			},
			500: {
				description: "Internal server error",
				content: jsonContent(error),
			},
		},
	});
}
