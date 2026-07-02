import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { apiErrorSchema } from "#/platform/http";
import {
	createOrganizationSchema,
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
}
