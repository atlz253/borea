import "#/platform/http/openapi-zod";
import { z } from "zod";

const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export const userNameSchema = z
	.string()
	.trim()
	.min(1, "Name is required")
	.max(MAX_NAME_LENGTH, "Name is too long");

export const emailSchema = z
	.email("Enter a valid email address")
	.trim()
	.toLowerCase();

export const passwordSchema = z
	.string()
	.min(MIN_PASSWORD_LENGTH, "Password must contain at least 8 characters")
	.max(MAX_PASSWORD_LENGTH, "Password is too long");

export const registerSchema = z.object({
	name: userNameSchema,
	email: emailSchema,
	password: passwordSchema,
});

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export const userSchema = z.object({
	id: z.uuid(),
	name: userNameSchema,
	email: emailSchema,
	createdAt: z.iso.datetime(),
});

export const passwordCredentialSchema = z.object({
	algorithm: z.literal("scrypt"),
	version: z.literal(1),
	salt: z.string(),
	hash: z.string(),
	cost: z.number().int().positive(),
	blockSize: z.number().int().positive(),
	parallelization: z.number().int().positive(),
	keyLength: z.number().int().positive(),
});

export const storedUserSchema = userSchema.extend({
	credential: passwordCredentialSchema,
});

export type User = z.infer<typeof userSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordCredential = z.infer<typeof passwordCredentialSchema>;
export type StoredUser = z.infer<typeof storedUserSchema>;
