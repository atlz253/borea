import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/tree/$branch/$",
)({
	loader: ({ params }) =>
		Promise.all([
			listRepositoryFilesFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
					path: params._splat ?? "",
					ref: params.branch,
				},
			}),
			countCommitsFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
					ref: params.branch,
				},
			}),
			listBranchesFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
				},
			}),
		]).then(([entries, commitCount, branches]) => {
			const selectedBranch = branches.find(
				(b: { name: string }) => b.name === params.branch,
			);
			if (!selectedBranch) {
				throw new Error(`Branch "${params.branch}" not found`);
			}
			return {
				entries,
				commitCount,
				branches,
				selectedBranch: params.branch,
			};
		}),
	component: () => {
		const { organization, repository, _splat } = Route.useParams();
		const { entries, commitCount, branches, selectedBranch } =
			Route.useLoaderData();
		return (
			<RepositoryPage
				organizationName={organization}
				name={repository}
				path={_splat ?? ""}
				entries={entries}
				commitCount={commitCount}
				branches={branches}
				selectedBranch={selectedBranch}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
