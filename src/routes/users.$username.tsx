import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AppShellLayout from "#/components/AppShellLayout";
import { getCurrentUserFn, getUserByUsernameFn } from "#/modules/auth";

export const Route = createFileRoute("/users/$username")({
	loader: async ({ params }) => {
		const [auth, profile] = await Promise.all([
			getCurrentUserFn(),
			getUserByUsernameFn({ data: { username: params.username } }),
		]);
		if (!profile) {
			throw new Error(`User "${params.username}" not found`);
		}
		if (!auth.user) {
			throw redirect({
				to: "/auth",
				search: { redirect: `/users/${params.username}` },
			});
		}
		return { auth, profile };
	},
	component: UsersLayout,
});

function UsersLayout() {
	const { auth } = Route.useLoaderData();
	if (!auth.user) return null;
	return (
		<AppShellLayout user={auth.user} authMode={auth.authMode}>
			<Outlet />
		</AppShellLayout>
	);
}
