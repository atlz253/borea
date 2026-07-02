import { createServerFn } from "@tanstack/react-start";
import { loginSchema, registerSchema } from "../schemas";

export const assertSameOriginFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { assertSameOriginRequest } = await import("../session");
		assertSameOriginRequest();
	},
);

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { authMode, authProvider } = await import("./auth.server");
		return {
			user: await authProvider.getCurrentUser(),
			authMode,
		};
	},
);

export const requireCurrentUserFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { authProvider } = await import("./auth.server");
		return authProvider.requireCurrentUser();
	},
);

export const registerFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => registerSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const { authProvider } = await import("./auth.server");
		return authProvider.register(data);
	});

export const loginFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => loginSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		const { authProvider } = await import("./auth.server");
		return authProvider.login(data);
	});

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
	await assertSameOriginFn();
	const { authProvider } = await import("./auth.server");
	await authProvider.logout();
});
