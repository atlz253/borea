import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertSameOriginFn, requireCurrentUserFn } from "#/modules/auth";
import {
	createOrganizationSchema,
	inviteOrganizationMemberSchema,
	organizationNameSchema,
	setRepositoryMemberRoleSchema,
	updateOrganizationMemberRoleSchema,
	updateOrganizationSchema,
} from "../schemas";

const organizationPermissionSchema = z.enum([
	"read",
	"inviteMembers",
	"manageMemberRoles",
	"removeMembers",
	"manageSettings",
	"createRepository",
	"deleteRepository",
	"manageRepositoryAccess",
	"deleteOrganization",
]);

const repositoryPermissionSchema = z.enum([
	"read",
	"write",
	"manageAccess",
	"delete",
]);

const MAX_REPOSITORY_NAME_LENGTH = 100;
const repositoryNameInputSchema = z
	.string()
	.min(1)
	.max(MAX_REPOSITORY_NAME_LENGTH);

const organizationMemberInputSchema = z.object({
	organizationName: organizationNameSchema,
	userId: z.uuid(),
});

const repositoryAccessInputSchema = z.object({
	organizationName: organizationNameSchema,
	repositoryName: repositoryNameInputSchema,
});

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

export const getOrganizationAccessFn = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.getOrganizationAccess(data, user.id);
	});

export const createOrganizationFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createOrganizationSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.createOrganization(data, user.id);
	});

export const updateOrganizationFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			description?: unknown;
		};
		return {
			organizationName: organizationNameSchema.parse(input.organizationName),
			...updateOrganizationSchema.parse({
				description: input.description,
			}),
		};
	})
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.updateOrganization(
			data.organizationName,
			{ description: data.description },
			user.id,
		);
	});

export const deleteOrganizationFn = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		organizationNameSchema.parse(
			(data as { organizationName?: unknown }).organizationName,
		),
	)
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		await organizationService.requireOrganizationPermission(
			data,
			user.id,
			"deleteOrganization",
		);
		const { deleteOrganizationRepositoriesFn } = await import(
			"#/modules/repositories"
		);
		await deleteOrganizationRepositoriesFn({
			data: { organizationName: data },
		});
		await organizationService.deleteOrganizationMetadata(data, user.id);
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

export const updateOrganizationMemberRoleFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			userId?: unknown;
			role?: unknown;
		};
		return {
			...organizationMemberInputSchema.parse(input),
			...updateOrganizationMemberRoleSchema.parse({ role: input.role }),
		};
	})
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.updateOrganizationMemberRole(
			data.organizationName,
			data.userId,
			data.role,
			user.id,
		);
	});

export const removeOrganizationMemberFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => organizationMemberInputSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		await organizationService.removeOrganizationMember(
			data.organizationName,
			data.userId,
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

export const requireOrganizationPermissionFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			permission?: unknown;
		};
		return {
			organizationName: organizationNameSchema.parse(input.organizationName),
			permission: organizationPermissionSchema.parse(input.permission),
		};
	})
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.requireOrganizationPermission(
			data.organizationName,
			user.id,
			data.permission,
		);
	});

export const requireRepositoryPermissionFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			repositoryName?: unknown;
			permission?: unknown;
		};
		return {
			...repositoryAccessInputSchema.parse(input),
			permission: repositoryPermissionSchema.parse(input.permission),
		};
	})
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.requireRepositoryPermission(
			data.organizationName,
			data.repositoryName,
			user.id,
			data.permission,
		);
	});

export const requireRepositoryPermissionForUser = createServerOnlyFn(
	async (
		organizationName: string,
		repositoryName: string,
		userId: string,
		permission: z.infer<typeof repositoryPermissionSchema>,
	) => {
		const { organizationService } = await import("./organization.server");
		return organizationService.requireRepositoryPermission(
			organizationName,
			repositoryName,
			userId,
			permission,
		);
	},
);

export const filterAccessibleRepositoriesFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			repositoryNames?: unknown;
		};
		return {
			organizationName: organizationNameSchema.parse(input.organizationName),
			repositoryNames: z
				.array(repositoryNameInputSchema)
				.parse(input.repositoryNames),
		};
	})
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		const access = await Promise.all(
			data.repositoryNames.map((repositoryName) =>
				organizationService.canReadRepository(
					data.organizationName,
					repositoryName,
					user.id,
				),
			),
		);
		return data.repositoryNames.filter((_, index) => access[index]);
	});

export const createRepositoryAccessFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => repositoryAccessInputSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.createRepositoryAccess(
			data.organizationName,
			data.repositoryName,
			user.id,
		);
	});

export const deleteRepositoryAccessFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => repositoryAccessInputSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const { organizationService } = await import("./organization.server");
		await organizationService.deleteRepositoryAccess(
			data.organizationName,
			data.repositoryName,
		);
	});

export const getRepositoryAccessFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => repositoryAccessInputSchema.parse(data))
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.getRepositoryAccess(
			data.organizationName,
			data.repositoryName,
			user.id,
		);
	});

export const listRepositoryMembersFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => repositoryAccessInputSchema.parse(data))
	.handler(async ({ data }) => {
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.listRepositoryMembers(
			data.organizationName,
			data.repositoryName,
			user.id,
		);
	});

export const setRepositoryMemberRoleFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			repositoryName?: unknown;
			userId?: unknown;
			role?: unknown;
		};
		return {
			...repositoryAccessInputSchema.parse(input),
			userId: z.uuid().parse(input.userId),
			...setRepositoryMemberRoleSchema.parse({ role: input.role }),
		};
	})
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		return organizationService.setRepositoryMemberRole(
			data.organizationName,
			data.repositoryName,
			data.userId,
			data.role,
			user.id,
		);
	});

export const removeRepositoryMemberFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const input = data as {
			organizationName?: unknown;
			repositoryName?: unknown;
			userId?: unknown;
		};
		return {
			...repositoryAccessInputSchema.parse(input),
			userId: z.uuid().parse(input.userId),
		};
	})
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const user = await requireCurrentUserFn();
		const { organizationService } = await import("./organization.server");
		await organizationService.removeRepositoryMember(
			data.organizationName,
			data.repositoryName,
			data.userId,
			user.id,
		);
	});
