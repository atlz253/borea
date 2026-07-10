import { createFileRoute } from "@tanstack/react-router";
import {
	CommitDiffPage,
	getCommitDiffFn,
	listBranchesFn,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/tree/$branch/commits/$sha",
)({
	loader: ({ params }) =>
		Promise.all([
			getCommitDiffFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
					sha: params.sha,
				},
			}),
			listBranchesFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
				},
			}),
		]).then(([result, branches]) => {
			const selectedBranch = branches.find(
				(b: { name: string }) => b.name === params.branch,
			);
			if (!selectedBranch) {
				throw new Error(`Branch "${params.branch}" not found`);
			}
			return { result, branches, selectedBranch: params.branch };
		}),
	component: () => {
		const { organization, repository, branch } = Route.useParams();
		const { result, branches } = Route.useLoaderData();
		return (
			<CommitDiffPage
				organizationName={organization}
				name={repository}
				branch={branch}
				result={result}
				branches={branches}
			/>
		);
	},
});
