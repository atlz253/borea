import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/",
)({
	loader: async ({ params }) => {
		const branches = await listBranchesFn({
			data: {
				organizationName: params.organization,
				name: params.repository,
			},
		});
		const defaultBranch = branches.find(
			(b: { isHead: boolean }) => b.isHead,
		)?.name;

		if (!defaultBranch) {
			const entries = await listRepositoryFilesFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
				},
			});
			return { entries, commitCount: 0, branches: [], selectedBranch: "" };
		}

		throw redirect({
			to: "/organizations/$organization/repositories/$repository/tree/$branch",
			params: {
				organization: params.organization,
				repository: params.repository,
				branch: encodeURIComponent(defaultBranch),
			},
		});
	},
	component: () => {
		const { organization, repository } = Route.useParams();
		const { entries, commitCount, branches, selectedBranch } =
			Route.useLoaderData();
		return (
			<RepositoryPage
				organizationName={organization}
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
