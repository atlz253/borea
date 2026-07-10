import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage, getCurrentUserFn } from "#/modules/auth";

function validateRedirect(value: unknown): string {
	return typeof value === "string" &&
		value.startsWith("/") &&
		!value.startsWith("//")
		? value
		: "/repositories";
}

export const Route = createFileRoute("/auth")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: validateRedirect(search.redirect),
	}),
	beforeLoad: async () => {
		const auth = await getCurrentUserFn();
		if (auth.authMode === "noauth") {
			throw redirect({ to: "/repositories" });
		}
	},
	component: () => <AuthPage redirectTo={Route.useSearch().redirect} />,
});
