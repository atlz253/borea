import { createServerOnlyFn } from "@tanstack/react-start";

const getAuthProvider = createServerOnlyFn(async () => {
	const { authProvider } = await import("./server/auth.server");
	return authProvider;
});

export const authUserDirectory = {
	async getUserByEmail(email: string) {
		return (await getAuthProvider()).getUserByEmail(email);
	},
	async getUserById(id: string) {
		return (await getAuthProvider()).getUserById(id);
	},
};
