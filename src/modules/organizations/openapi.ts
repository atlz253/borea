import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { apiErrorSchema } from "#/platform/http";
import {
	createOrganizationSchema,
	inviteOrganizationMemberSchema,
	organizationMemberResponseSchema,
	organizationNameSchema,
	organizationResponseSchema,
	updateOrganizationMemberRoleSchema,
	updateOrganizationSchema,
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
		z.array(organizationMemberResponseSchema),
	);
	const member = registry.register(
		"OrganizationMember",
		organizationMemberResponseSchema,
	);
	const params = z.object({ organization: organizationNameSchema });
	const memberParams = params.extend({ userId: z.uuid() });

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
		method: "patch",
		path: "/api/v1/organizations/{organization}",
		tags: ["Organizations"],
		summary: "Update organization settings",
		request: {
			params,
			body: { content: jsonContent(updateOrganizationSchema) },
		},
		responses: {
			200: {
				description: "Organization updated",
				content: jsonContent(organization),
			},
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: {
				description: "Organization not found",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "delete",
		path: "/api/v1/organizations/{organization}",
		tags: ["Organizations"],
		summary: "Delete organization",
		request: { params },
		responses: {
			204: { description: "Organization deleted" },
			403: {
				description: "Only the owner can delete",
				content: jsonContent(error),
			},
			404: {
				description: "Organization not found",
				content: jsonContent(error),
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
				content: jsonContent(member),
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
	registry.registerPath({
		method: "patch",
		path: "/api/v1/organizations/{organization}/members/{userId}",
		tags: ["Organizations"],
		summary: "Update organization member role",
		request: {
			params: memberParams,
			body: { content: jsonContent(updateOrganizationMemberRoleSchema) },
		},
		responses: {
			200: {
				description: "Member role updated",
				content: jsonContent(member),
			},
			403: {
				description: "Role assignment denied",
				content: jsonContent(error),
			},
			404: {
				description: "Organization or member not found",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "delete",
		path: "/api/v1/organizations/{organization}/members/{userId}",
		tags: ["Organizations"],
		summary: "Remove organization member",
		request: { params: memberParams },
		responses: {
			204: { description: "Member removed" },
			403: {
				description: "Member removal denied",
				content: jsonContent(error),
			},
			404: {
				description: "Organization or member not found",
				content: jsonContent(error),
			},
			409: {
				description: "Member owns a repository",
				content: jsonContent(error),
			},
		},
	});
}
