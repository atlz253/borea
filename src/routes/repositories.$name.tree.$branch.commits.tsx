import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RepositoryError } from "#/modules/repositories";

export const Route = createFileRoute(
	"/repositories/$name/tree/$branch/commits",
)({
	component: () => <Outlet />,
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
