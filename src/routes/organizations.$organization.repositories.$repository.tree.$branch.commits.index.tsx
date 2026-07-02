import { createFileRoute } from "@tanstack/react-router";
import {
	CommitHistoryPage,
	listBranchesFn,
	listCommitsFn,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/tree/$branch/commits/",
)({
	loader: ({ params }) =>
		Promise.all([
			listCommitsFn({
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
		]).then(([commits, branches]) => {
			const selectedBranch = branches.find(
				(b: { name: string }) => b.name === params.branch,
			);
			if (!selectedBranch) {
				throw new Error(`Branch "${params.branch}" not found`);
			}
			return {
				commits,
				branches,
				selectedBranch: params.branch,
			};
		}),
	component: () => {
		const { organization, repository } = Route.useParams();
		const { commits, branches, selectedBranch } = Route.useLoaderData();
		return (
			<CommitHistoryPage
				organizationName={organization}
				name={repository}
				commits={commits}
				branches={branches}
				selectedBranch={selectedBranch}
			/>
		);
	},
});
