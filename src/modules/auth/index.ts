export type { AuthProvider } from "./auth-provider";
export { registerAuthOpenApi } from "./openapi";
export { default as AuthPage } from "./pages/AuthPage";
export type {
	LoginInput,
	RegisterInput,
	StoredUser,
	User,
} from "./schemas";
export {
	loginSchema,
	passwordSchema,
	registerSchema,
	userSchema,
} from "./schemas";
export {
	assertSameOriginFn,
	getCurrentUserFn,
	loginFn,
	logoutFn,
	registerFn,
	requireCurrentUserFn,
} from "./server/auth.functions";
