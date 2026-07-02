import { createFileRoute } from "@tanstack/react-router";
import {
	listPullRequestsFn,
	PullRequestsListPage,
} from "#/modules/pull-requests";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/pulls/",
)({
	loader: ({ params }) =>
		listPullRequestsFn({
			data: {
				organizationName: params.organization,
				repoName: params.repository,
			},
		}),
	component: () => {
		const { organization, repository } = Route.useParams();
		const pullRequests = Route.useLoaderData();
		return (
			<PullRequestsListPage
				organizationName={organization}
				repoName={repository}
				pullRequests={pullRequests}
			/>
		);
	},
});
