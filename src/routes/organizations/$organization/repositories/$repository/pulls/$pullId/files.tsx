import { createFileRoute } from "@tanstack/react-router";
import {
	getPullRequestDiffFn,
	getPullRequestFn,
	listPullRequestCommentsFn,
	PullRequestFilesPage,
} from "#/modules/pull-requests";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/pulls/$pullId/files",
)({
	loader: async ({ params }) => {
		const id = Number(params.pullId);
		if (Number.isNaN(id) || id < 1) {
			throw new Error("Invalid pull request id");
		}

		const data = {
			organizationName: params.organization,
			repoName: params.repository,
			id,
		};
		const [pullRequest, files, comments] = await Promise.all([
			getPullRequestFn({ data }),
			getPullRequestDiffFn({ data }),
			listPullRequestCommentsFn({ data }),
		]);
		if (!pullRequest) {
			throw new Error(`Pull request #${id} not found`);
		}

		return { pullRequest, files, comments };
	},
	component: PullRequestFilesRoute,
});

function PullRequestFilesRoute() {
	const { pullRequest, files, comments } = Route.useLoaderData();

	return (
		<PullRequestFilesPage
			pullRequest={pullRequest}
			files={files}
			comments={comments}
		/>
	);
}
