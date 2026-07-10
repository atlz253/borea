import { createFileRoute } from "@tanstack/react-router";
import {
	CommitHistoryPage,
	listBranchesFn,
	listCommitsFn,
	RepositoryError,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository/tree/$branch/commits/",
)({
	loader: ({ params }) =>
		Promise.all([
			listCommitsFn({
				data: {
					userName: params.username,
					name: params.repository,
					ref: params.branch,
				},
			}),
			listBranchesFn({
				data: { userName: params.username, name: params.repository },
			}),
		]).then(([commits, branches]) => ({ commits, branches })),
	component: () => {
		const { username, repository, branch } = Route.useParams();
		const { commits, branches } = Route.useLoaderData();
		return (
			<CommitHistoryPage
				userName={username}
				name={repository}
				commits={commits}
				branches={branches}
				selectedBranch={branch}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
