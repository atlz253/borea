import { createFileRoute } from "@tanstack/react-router";
import {
	listPullRequestsFn,
	PullRequestsListPage,
} from "#/modules/pull-requests";

export const Route = createFileRoute("/repositories/$name/pulls/")({
	loader: ({ params }) =>
		listPullRequestsFn({ data: { repoName: params.name } }),
	component: () => {
		const { name } = Route.useParams();
		const pullRequests = Route.useLoaderData();
		return <PullRequestsListPage repoName={name} pullRequests={pullRequests} />;
	},
});
