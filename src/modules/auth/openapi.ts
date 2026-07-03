import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { apiErrorSchema } from "#/platform/http";
import {
	createdGitTokenSchema,
	createGitTokenSchema,
	gitTokenSchema,
	loginSchema,
	registerSchema,
	userSchema,
} from "./schemas";

const jsonContent = (schema: z.ZodType) => ({
	"application/json": { schema },
});

export function registerAuthOpenApi(registry: OpenAPIRegistry): void {
	const user = registry.register("User", userSchema);
	const error = registry.register("AuthApiError", apiErrorSchema);

	for (const operation of [
		{
			path: "/api/v1/auth/register",
			summary: "Register a user",
			schema: registerSchema,
		},
		{
			path: "/api/v1/auth/login",
			summary: "Sign in",
			schema: loginSchema,
		},
	] as const) {
		registry.registerPath({
			method: "post",
			path: operation.path,
			tags: ["Authentication"],
			summary: operation.summary,
			request: { body: { content: jsonContent(operation.schema) } },
			responses: {
				200: {
					description: "Authenticated user",
					content: jsonContent(user),
				},
				400: { description: "Invalid input", content: jsonContent(error) },
				401: {
					description: "Invalid credentials",
					content: jsonContent(error),
				},
				409: {
					description: "Email already registered",
					content: jsonContent(error),
				},
			},
		});
	}

	registry.registerPath({
		method: "post",
		path: "/api/v1/auth/logout",
		tags: ["Authentication"],
		summary: "Sign out",
		responses: { 204: { description: "Session cleared" } },
	});

	registry.registerPath({
		method: "get",
		path: "/api/v1/auth/me",
		tags: ["Authentication"],
		summary: "Get the current user",
		responses: {
			200: {
				description: "Current user",
				content: jsonContent(user),
			},
			401: {
				description: "Authentication required",
				content: jsonContent(error),
			},
		},
	});

	const gitToken = registry.register("GitToken", gitTokenSchema);
	const createdGitToken = registry.register(
		"CreatedGitToken",
		createdGitTokenSchema,
	);

	registry.registerPath({
		method: "get",
		path: "/api/v1/auth/git-tokens",
		tags: ["Authentication"],
		summary: "List Git personal access tokens",
		responses: {
			200: {
				description: "Git token metadata",
				content: jsonContent(gitToken.array()),
			},
			401: {
				description: "Authentication required",
				content: jsonContent(error),
			},
			403: {
				description: "Unavailable in NoAuth mode",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "post",
		path: "/api/v1/auth/git-tokens",
		tags: ["Authentication"],
		summary: "Create a Git personal access token",
		request: { body: { content: jsonContent(createGitTokenSchema) } },
		responses: {
			201: {
				description: "Created Git token with its one-time secret",
				content: jsonContent(createdGitToken),
			},
			400: { description: "Invalid input", content: jsonContent(error) },
			401: {
				description: "Authentication required",
				content: jsonContent(error),
			},
			403: {
				description: "Unavailable in NoAuth mode",
				content: jsonContent(error),
			},
		},
	});

	registry.registerPath({
		method: "delete",
		path: "/api/v1/auth/git-tokens/{tokenId}",
		tags: ["Authentication"],
		summary: "Revoke a Git personal access token",
		request: {
			params: z.object({ tokenId: z.uuid() }),
		},
		responses: {
			204: { description: "Git token revoked" },
			400: { description: "Invalid token ID", content: jsonContent(error) },
			401: {
				description: "Authentication required",
				content: jsonContent(error),
			},
			403: {
				description: "Unavailable in NoAuth mode",
				content: jsonContent(error),
			},
		},
	});
}
