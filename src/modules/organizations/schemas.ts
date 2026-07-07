import "#/platform/http/openapi-zod";
import { z } from "zod";
import { emailSchema, userSchema } from "#/modules/auth";
import * as m from "#/paraglide/messages";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export const organizationNameSchema = z
	.string()
	.min(1, m.organizations_schemas_nameRequired())
	.max(MAX_NAME_LENGTH, m.organizations_schemas_nameTooLong())
	.regex(/^[a-z0-9._-]+$/, m.organizations_schemas_nameInvalidChars())
	.refine(
		(name) => !name.startsWith("."),
		m.organizations_schemas_nameDotStart(),
	)
	.refine(
		(name) => name !== "." && name !== "..",
		m.organizations_schemas_nameInvalid(),
	);

export const createOrganizationSchema = z.object({
	name: organizationNameSchema,
	description: z
		.string()
		.trim()
		.max(MAX_DESCRIPTION_LENGTH, m.organizations_schemas_descriptionTooLong())
		.optional()
		.default(""),
});

export const updateOrganizationSchema = z.object({
	description: z
		.string()
		.trim()
		.max(MAX_DESCRIPTION_LENGTH, m.organizations_schemas_descriptionTooLong()),
});

export const organizationRoleSchema = z.enum([
	"owner",
	"administrator",
	"moderator",
	"member",
]);

export const repositoryRoleSchema = z.enum(["read", "write", "moderator"]);

export const organizationSchema = z.object({
	name: organizationNameSchema,
	description: z.string().optional(),
	createdAt: z.date(),
	ownerId: z.uuid().optional(),
});

export const organizationStorageSchema = z.object({
	name: organizationNameSchema,
	description: z.string().optional(),
	createdAt: z.iso.datetime(),
	ownerId: z.uuid().optional(),
});

export const organizationMemberStorageSchema = z.object({
	userId: z.uuid(),
	role: organizationRoleSchema,
	createdAt: z.iso.datetime(),
});

export const inviteOrganizationMemberSchema = z.object({
	email: emailSchema,
});

export const updateOrganizationMemberRoleSchema = z.object({
	role: organizationRoleSchema,
});

export const repositoryAccessStorageSchema = z.object({
	ownerId: z.uuid(),
	createdAt: z.iso.datetime(),
});

export const repositoryMemberStorageSchema = z.object({
	userId: z.uuid(),
	role: repositoryRoleSchema,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const setRepositoryMemberRoleSchema = z.object({
	role: repositoryRoleSchema,
});

export const organizationResponseSchema = z.object({
	name: organizationNameSchema,
	description: z.string().optional(),
	createdAt: z.iso.datetime(),
	ownerId: z.uuid().optional(),
});

export const organizationMemberResponseSchema = userSchema.extend({
	role: organizationRoleSchema,
});

export const repositoryMemberResponseSchema = userSchema.extend({
	role: repositoryRoleSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type StoredOrganization = z.infer<typeof organizationStorageSchema>;
export type StoredOrganizationMember = z.infer<
	typeof organizationMemberStorageSchema
>;
export type InviteOrganizationMemberInput = z.infer<
	typeof inviteOrganizationMemberSchema
>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type RepositoryRole = z.infer<typeof repositoryRoleSchema>;
export type OrganizationMember = z.infer<
	typeof organizationMemberResponseSchema
>;
export type StoredRepositoryAccess = z.infer<
	typeof repositoryAccessStorageSchema
>;
export type StoredRepositoryMember = z.infer<
	typeof repositoryMemberStorageSchema
>;
export type RepositoryMember = z.infer<typeof repositoryMemberResponseSchema>;
