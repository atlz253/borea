import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/organizations/$organization/tasks")({
	component: Outlet,
});
