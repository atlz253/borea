import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository/tree/$branch/commits",
)({
	component: Outlet,
});
