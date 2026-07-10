import "#/platform/http/openapi-zod";
import { z } from "zod";
import * as m from "#/paraglide/messages";

const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const GIT_TOKEN_PREFIX = "borea";
const SHA256_HEX_LENGTH = 64;

export const userNameSchema = z
	.string()
	.trim()
	.min(1, m.auth_schemas_nameRequired())
	.max(MAX_NAME_LENGTH, m.auth_schemas_nameTooLong());

export const usernameSchema = z
	.string()
	.trim()
	.min(1, m.auth_schemas_usernameRequired())
	.max(MAX_NAME_LENGTH, m.auth_schemas_usernameTooLong())
	.regex(/^[a-zA-Z0-9._-]+$/, m.auth_schemas_usernameInvalidChars())
	.refine((username) => !username.startsWith("."), {
		message: m.auth_schemas_usernameDotStart(),
	})
	.refine((username) => username !== "." && username !== "..", {
		message: m.auth_schemas_usernameInvalid(),
	});

export const emailSchema = z
	.email(m.auth_schemas_emailInvalid())
	.trim()
	.toLowerCase();

export const passwordSchema = z
	.string()
	.min(MIN_PASSWORD_LENGTH, m.auth_schemas_passwordMinLength())
	.max(MAX_PASSWORD_LENGTH, m.auth_schemas_passwordTooLong());

export const registerSchema = z.object({
	username: usernameSchema,
	email: emailSchema,
	password: passwordSchema,
});

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export const userSchema = z.object({
	id: z.uuid(),
	username: usernameSchema,
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

export const gitTokenNameSchema = z
	.string()
	.trim()
	.min(1, m.auth_schemas_tokenNameRequired())
	.max(MAX_NAME_LENGTH, m.auth_schemas_tokenNameTooLong());

export const createGitTokenSchema = z.object({
	name: gitTokenNameSchema,
});

export const gitTokenIdSchema = z.uuid();

export const gitTokenSchema = z.object({
	id: gitTokenIdSchema,
	name: gitTokenNameSchema,
	createdAt: z.iso.datetime(),
});

export const createdGitTokenSchema = gitTokenSchema.extend({
	token: z.string().startsWith(`${GIT_TOKEN_PREFIX}_`),
});

export const storedGitTokenSchema = gitTokenSchema.extend({
	userId: z.uuid(),
	secretHash: z.string().length(SHA256_HEX_LENGTH),
});

export type User = z.infer<typeof userSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordCredential = z.infer<typeof passwordCredentialSchema>;
export type StoredUser = z.infer<typeof storedUserSchema>;
export type CreateGitTokenInput = z.infer<typeof createGitTokenSchema>;
export type GitToken = z.infer<typeof gitTokenSchema>;
export type CreatedGitToken = z.infer<typeof createdGitTokenSchema>;
export type StoredGitToken = z.infer<typeof storedGitTokenSchema>;
