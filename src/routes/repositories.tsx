import { createFileRoute, redirect } from "@tanstack/react-router";
import AppShellLayout from "#/components/AppShellLayout";
import { getCurrentUserFn } from "#/modules/auth";
import {
	listUserRepositoriesFn,
	RepositoriesPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories")({
	loader: async () => {
		const auth = await getCurrentUserFn();
		if (!auth.user) {
			throw redirect({ to: "/auth", search: { redirect: "/repositories" } });
		}
		const repositories = await listUserRepositoriesFn({
			data: { userName: auth.user.username },
		});
		return { auth, repositories };
	},
	component: RepositoriesRoute,
});

function RepositoriesRoute() {
	const { auth, repositories } = Route.useLoaderData();
	if (!auth.user) return null;
	return (
		<AppShellLayout user={auth.user} authMode={auth.authMode}>
			<RepositoriesPage
				userName={auth.user.username}
				repositories={repositories}
				canCreate={true}
			/>
		</AppShellLayout>
	);
}
