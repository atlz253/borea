import { createFileRoute } from "@tanstack/react-router";
import {
	getPullRequestDiffFn,
	getPullRequestFn,
	PullRequestFilesPage,
} from "#/modules/pull-requests";

export const Route = createFileRoute("/repositories/$name/pulls/$pullId/files")(
	{
		loader: async ({ params }) => {
			const id = Number(params.pullId);
			if (Number.isNaN(id) || id < 1) {
				throw new Error("Invalid pull request id");
			}

			const pullRequest = await getPullRequestFn({
				data: { repoName: params.name, id },
			});
			if (!pullRequest) {
				throw new Error(`Pull request #${id} not found`);
			}

			const files = await getPullRequestDiffFn({
				data: { repoName: params.name, id },
			});

			return { pullRequest, files };
		},
		component: PullRequestFilesRoute,
	},
);

function PullRequestFilesRoute() {
	const { pullRequest, files } = Route.useLoaderData();

	return <PullRequestFilesPage pullRequest={pullRequest} files={files} />;
}
