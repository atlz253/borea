import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { usernameSchema } from "#/modules/auth";
import {
	organizationNameSchema,
	repositoryMemberResponseSchema,
	setRepositoryMemberRoleSchema,
} from "#/modules/organizations";
import { apiErrorSchema } from "#/platform/http";
import { repoNameSchema, repositoryResponseSchema } from "./schemas";

const MAX_REPOSITORY_DESCRIPTION_LENGTH = 500;

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
	const repositoryMembers = registry.register(
		"RepositoryMemberList",
		z.array(repositoryMemberResponseSchema),
	);
	const organizationParams = z.object({
		organization: organizationNameSchema,
	});
	const params = organizationParams.extend({
		repository: repoNameSchema,
	});
	const memberParams = params.extend({ userId: z.uuid() });
	const userParams = z.object({
		username: usernameSchema,
	});
	const userRepositoryParams = userParams.extend({
		repository: repoNameSchema,
	});
	const createRepositoryBody = z.object({
		name: repoNameSchema,
		description: z.string().max(MAX_REPOSITORY_DESCRIPTION_LENGTH).optional(),
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
		method: "get",
		path: "/api/v1/users/{username}/repositories",
		tags: ["Repositories"],
		summary: "List personal repositories",
		request: { params: userParams },
		responses: {
			200: {
				description: "Personal repository list",
				content: jsonContent(repositoryList),
			},
			404: {
				description: "User not found",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "post",
		path: "/api/v1/users/{username}/repositories",
		tags: ["Repositories"],
		summary: "Create personal repository",
		request: {
			params: userParams,
			body: { content: jsonContent(createRepositoryBody) },
		},
		responses: {
			201: {
				description: "Repository created",
				content: jsonContent(repository),
			},
			400: {
				description: "Invalid repository name",
				content: jsonContent(error),
			},
			403: {
				description: "Cannot create repository for another user",
				content: jsonContent(error),
			},
			409: {
				description: "Repository already exists",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "get",
		path: "/api/v1/users/{username}/repositories/{repository}",
		tags: ["Repositories"],
		summary: "Get personal repository",
		request: { params: userRepositoryParams },
		responses: {
			200: {
				description: "Repository data",
				content: jsonContent(repository),
			},
			404: {
				description: "Repository not found",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "delete",
		path: "/api/v1/users/{username}/repositories/{repository}",
		tags: ["Repositories"],
		summary: "Delete personal repository",
		request: { params: userRepositoryParams },
		responses: {
			204: { description: "Repository deleted" },
			404: {
				description: "Repository not found",
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

	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}/repositories/{repository}/members",
		tags: ["Repositories"],
		summary: "List repository members",
		request: { params },
		responses: {
			200: {
				description: "Repository member grants",
				content: jsonContent(repositoryMembers),
			},
			403: {
				description: "Access management denied",
				content: jsonContent(error),
			},
			404: { description: "Repository not found", content: jsonContent(error) },
		},
	});

	registry.registerPath({
		method: "put",
		path: "/api/v1/organizations/{organization}/repositories/{repository}/members/{userId}",
		tags: ["Repositories"],
		summary: "Set repository member role",
		request: {
			params: memberParams,
			body: { content: jsonContent(setRepositoryMemberRoleSchema) },
		},
		responses: {
			200: {
				description: "Repository member role set",
				content: jsonContent(repositoryMemberResponseSchema),
			},
			403: {
				description: "Role assignment denied",
				content: jsonContent(error),
			},
			404: {
				description: "Repository or member not found",
				content: jsonContent(error),
			},
			409: {
				description: "Role conflicts with ownership",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "delete",
		path: "/api/v1/organizations/{organization}/repositories/{repository}/members/{userId}",
		tags: ["Repositories"],
		summary: "Remove repository member role",
		request: { params: memberParams },
		responses: {
			204: { description: "Repository member role removed" },
			403: { description: "Role removal denied", content: jsonContent(error) },
			404: {
				description: "Repository or member not found",
				content: jsonContent(error),
			},
			409: {
				description: "Repository owner cannot be removed",
				content: jsonContent(error),
			},
		},
	});

	const branchResponseSchema = z.object({
		name: z.string(),
		isHead: z.boolean(),
	});
	const branchResponse = registry.register("BranchInfo", branchResponseSchema);

	registry.registerPath({
		method: "post",
		path: "/api/v1/organizations/{organization}/repositories/{repository}/branches/rename",
		tags: ["Repositories"],
		summary: "Rename a repository branch",
		request: {
			params,
			body: {
				content: jsonContent(
					z.object({
						oldName: z.string().min(1),
						newName: z.string().min(1),
					}),
				),
			},
		},
		responses: {
			200: {
				description: "Branch renamed",
				content: jsonContent(branchResponse),
			},
			400: {
				description: "Invalid branch name",
				content: jsonContent(error),
			},
			404: {
				description: "Repository or branch not found",
				content: jsonContent(error),
			},
			409: {
				description: "Branch with target name already exists",
				content: jsonContent(error),
			},
			500: {
				description: "Internal server error",
				content: jsonContent(error),
			},
		},
	});
}
