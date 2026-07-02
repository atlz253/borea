import "#/platform/http/openapi-zod";
import { z } from "zod";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export const organizationNameSchema = z
	.string()
	.min(1, "Organization name is required")
	.max(MAX_NAME_LENGTH, "Organization name is too long")
	.regex(
		/^[a-z0-9._-]+$/,
		"Only lowercase letters, numbers, dots, hyphens, and underscores allowed",
	)
	.refine((name) => !name.startsWith("."), "Name cannot start with a dot")
	.refine((name) => name !== "." && name !== "..", "Invalid name");

export const createOrganizationSchema = z.object({
	name: organizationNameSchema,
	description: z
		.string()
		.trim()
		.max(MAX_DESCRIPTION_LENGTH, "Description is too long")
		.optional()
		.default(""),
});

export const organizationSchema = z.object({
	name: organizationNameSchema,
	description: z.string().optional(),
	createdAt: z.date(),
});

export const organizationStorageSchema = organizationSchema.extend({
	createdAt: z.iso.datetime(),
});

export const organizationResponseSchema = organizationStorageSchema;

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type Organization = z.infer<typeof organizationSchema>;
