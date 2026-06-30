import { z } from "zod";

const MAX_NAME_LENGTH = 100;
const MAX_DESC_LENGTH = 500;

export const repoNameSchema = z
	.string()
	.min(1, "Repository name is required")
	.max(MAX_NAME_LENGTH, "Repository name is too long")
	.regex(
		/^[a-zA-Z0-9._-]+$/,
		"Only letters, numbers, dots, hyphens, and underscores allowed",
	)
	.refine((name) => !name.startsWith("."), "Name cannot start with a dot")
	.refine(
		(name) => !name.toLowerCase().endsWith(".git"),
		"Name cannot end with .git",
	)
	.refine((name) => name !== "." && name !== "..", "Invalid name");

export const createRepositorySchema = z.object({
	name: repoNameSchema,
	description: z
		.string()
		.trim()
		.max(MAX_DESC_LENGTH, "Description is too long")
		.optional()
		.default(""),
});

export const repositorySchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	createdAt: z.date(),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
export type Repository = z.infer<typeof repositorySchema>;
