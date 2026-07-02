import { createServerFn } from "@tanstack/react-start";
import { createOrganizationSchema, organizationNameSchema } from "../schemas";

export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { organizationService } = await import("./organization.server");
		return organizationService.listOrganizations();
	},
);

export const getOrganizationFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		const { organizationService } = await import("./organization.server");
		return organizationService.getOrganization(data);
	});

export const createOrganizationFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createOrganizationSchema.parse(data))
	.handler(async ({ data }) => {
		const { organizationService } = await import("./organization.server");
		return organizationService.createOrganization(data);
	});

export const getOrganizationModeFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { organizationMode } = await import("./organization.server");
		return organizationMode;
	},
);

export const requireOrganizationFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		const { organizationService } = await import("./organization.server");
		return organizationService.requireOrganization(data);
	});
