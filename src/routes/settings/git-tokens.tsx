import { createFileRoute } from "@tanstack/react-router";
import { GitTokensPage, listGitTokensFn } from "#/modules/auth";

export const Route = createFileRoute("/settings/git-tokens")({
	loader: () => listGitTokensFn(),
	component: GitTokensRoute,
});

function GitTokensRoute() {
	return <GitTokensPage initialTokens={Route.useLoaderData()} />;
}
