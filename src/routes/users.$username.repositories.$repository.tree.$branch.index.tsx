import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository/tree/$branch/",
)({
	loader: ({ params }) =>
		Promise.all([
			listRepositoryFilesFn({
				data: {
					userName: params.username,
					name: params.repository,
					ref: params.branch,
				},
			}),
			countCommitsFn({
				data: {
					userName: params.username,
					name: params.repository,
					ref: params.branch,
				},
			}),
			listBranchesFn({
				data: { userName: params.username, name: params.repository },
			}),
		]).then(([entries, commitCount, branches]) => {
			if (!branches.some((branch) => branch.name === params.branch)) {
				throw new Error(`Branch "${params.branch}" not found`);
			}
			return { entries, commitCount, branches, selectedBranch: params.branch };
		}),
	component: () => {
		const { username, repository } = Route.useParams();
		const { entries, commitCount, branches, selectedBranch } =
			Route.useLoaderData();
		return (
			<RepositoryPage
				userName={username}
				name={repository}
				path=""
				entries={entries}
				commitCount={commitCount}
				branches={branches}
				selectedBranch={selectedBranch}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
