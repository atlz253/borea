import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { userSchema } from "#/modules/auth";
import { apiErrorSchema } from "#/platform/http";
import {
	createOrganizationSchema,
	inviteOrganizationMemberSchema,
	organizationNameSchema,
	organizationResponseSchema,
} from "./schemas";

const jsonContent = (schema: z.ZodType) => ({
	"application/json": { schema },
});

export function registerOrganizationOpenApi(registry: OpenAPIRegistry): void {
	const organization = registry.register(
		"Organization",
		organizationResponseSchema,
	);
	const organizations = registry.register(
		"OrganizationList",
		z.array(organizationResponseSchema),
	);
	const error = registry.register("OrganizationApiError", apiErrorSchema);
	const members = registry.register(
		"OrganizationMemberList",
		z.array(userSchema),
	);
	const params = z.object({ organization: organizationNameSchema });

	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations",
		tags: ["Organizations"],
		summary: "List organizations",
		responses: {
			200: {
				description: "Organization list",
				content: jsonContent(organizations),
			},
		},
	});
	registry.registerPath({
		method: "post",
		path: "/api/v1/organizations",
		tags: ["Organizations"],
		summary: "Create organization",
		request: { body: { content: jsonContent(createOrganizationSchema) } },
		responses: {
			201: {
				description: "Organization created",
				content: jsonContent(organization),
			},
			400: { description: "Invalid input", content: jsonContent(error) },
			409: { description: "Conflict", content: jsonContent(error) },
		},
	});
	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}",
		tags: ["Organizations"],
		summary: "Get organization",
		request: { params },
		responses: {
			200: {
				description: "Organization data",
				content: jsonContent(organization),
			},
			404: {
				description: "Organization not found",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}/members",
		tags: ["Organizations"],
		summary: "List organization members",
		request: { params },
		responses: {
			200: {
				description: "Organization member list",
				content: jsonContent(members),
			},
			404: {
				description: "Organization not found or inaccessible",
				content: jsonContent(error),
			},
			409: {
				description: "Membership unavailable",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "post",
		path: "/api/v1/organizations/{organization}/members",
		tags: ["Organizations"],
		summary: "Invite an organization member",
		request: {
			params,
			body: { content: jsonContent(inviteOrganizationMemberSchema) },
		},
		responses: {
			201: {
				description: "Organization member added",
				content: jsonContent(userSchema),
			},
			400: { description: "Invalid input", content: jsonContent(error) },
			404: {
				description: "Organization or user not found",
				content: jsonContent(error),
			},
			409: {
				description: "Already a member or membership unavailable",
				content: jsonContent(error),
			},
		},
	});
}
