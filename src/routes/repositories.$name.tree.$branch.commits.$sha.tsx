import { createFileRoute } from "@tanstack/react-router";
import {
	CommitDiffPage,
	getCommitDiffFn,
	listBranchesFn,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/repositories/$name/tree/$branch/commits/$sha",
)({
	loader: ({ params }) =>
		Promise.all([
			getCommitDiffFn({ data: { name: params.name, sha: params.sha } }),
			listBranchesFn({ data: { name: params.name } }),
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
		const { name, branch } = Route.useParams();
		const { result, branches } = Route.useLoaderData();
		return (
			<CommitDiffPage
				name={name}
				branch={branch}
				result={result}
				branches={branches}
			/>
		);
	},
});
