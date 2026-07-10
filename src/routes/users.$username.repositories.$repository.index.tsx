import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository/",
)({
	loader: async ({ params }) => {
		const branches = await listBranchesFn({
			data: { userName: params.username, name: params.repository },
		});
		const defaultBranch = branches.find((branch) => branch.isHead)?.name;

		if (!defaultBranch) {
			const entries = await listRepositoryFilesFn({
				data: { userName: params.username, name: params.repository },
			});
			return { entries, commitCount: 0, branches: [], selectedBranch: "" };
		}

		throw redirect({
			to: "/users/$username/repositories/$repository/tree/$branch",
			params: {
				username: params.username,
				repository: params.repository,
				branch: encodeURIComponent(defaultBranch),
			},
		});
	},
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
