import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RepositoryError } from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/tree/$branch/commits",
)({
	component: () => <Outlet />,
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
