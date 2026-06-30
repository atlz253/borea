import { createFileRoute } from "@tanstack/react-router";
import { RepositoriesPage } from "#/modules/repositories";

export const Route = createFileRoute("/repositories")({
	component: RepositoriesPage,
});
