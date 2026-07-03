import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AppShellLayout from "#/components/AppShellLayout";
import { getCurrentUserFn } from "#/modules/auth";

export const Route = createFileRoute("/settings")({
	beforeLoad: async ({ location }) => {
		const auth = await getCurrentUserFn();
		if (!auth.user) {
			throw redirect({
				to: "/auth",
				search: { redirect: location.href },
			});
		}
		if (auth.authMode === "noauth") {
			throw redirect({ to: "/organizations" });
		}
		return auth;
	},
	component: SettingsLayout,
});

function SettingsLayout() {
	const { authMode, user } = Route.useRouteContext();
	if (!user) {
		return null;
	}
	return (
		<AppShellLayout user={user} authMode={authMode}>
			<Outlet />
		</AppShellLayout>
	);
}
