import { createFileRoute } from "@tanstack/react-router";
import {
	CommitDiffPage,
	getCommitDiffFn,
	listBranchesFn,
	RepositoryError,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository/tree/$branch/commits/$sha",
)({
	loader: ({ params }) =>
		Promise.all([
			getCommitDiffFn({
				data: {
					userName: params.username,
					name: params.repository,
					sha: params.sha,
				},
			}),
			listBranchesFn({
				data: { userName: params.username, name: params.repository },
			}),
		]).then(([result, branches]) => ({ result, branches })),
	component: () => {
		const { username, repository, branch } = Route.useParams();
		const { result, branches } = Route.useLoaderData();
		return (
			<CommitDiffPage
				userName={username}
				name={repository}
				branch={branch}
				result={result}
				branches={branches}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
