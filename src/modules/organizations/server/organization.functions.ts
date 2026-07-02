import { createServerFn } from "@tanstack/react-start";
import { assertSameOriginFn, requireCurrentUserFn } from "#/modules/auth";
import {
	createOrganizationSchema,
	inviteOrganizationMemberSchema,
	organizationNameSchema,
} from "../schemas";

export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.listOrganizations(user.id);
	},
);

export const getOrganizationFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.getOrganization(data, user.id);
	});

export const createOrganizationFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createOrganizationSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.createOrganization(data, user.id);
	});

export const listOrganizationMembersFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.listOrganizationMembers(data, user.id);
	});

export const inviteOrganizationMemberFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			email?: unknown;
		};
		return {
			organizationName: organizationNameSchema.parse(input.organizationName),
			...inviteOrganizationMemberSchema.parse({ email: input.email }),
		};
	})
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.inviteOrganizationMember(
			data.organizationName,
			{ email: data.email },
			user.id,
		);
	});

export const getOrganizationModeFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { organizationMode } = await import("./organization.server");
		return organizationMode;
	},
);

export const getPublicOrganizationFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		const { publicOrganizationService } = await import("./organization.server");
		return publicOrganizationService.getOrganization(data);
	});

export const requireOrganizationFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.requireOrganization(data, user.id);
	});
