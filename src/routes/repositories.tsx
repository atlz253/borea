import { createFileRoute } from "@tanstack/react-router";
import { listRepositoriesFn, RepositoriesPage } from "#/modules/repositories";

export const Route = createFileRoute("/repositories")({
	loader: () => listRepositoriesFn(),
	component: RepositoriesPage,
});
