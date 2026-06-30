import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/repositories/$name")({
	component: () => <Outlet />,
});
