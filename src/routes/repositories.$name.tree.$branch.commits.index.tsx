import { createFileRoute } from "@tanstack/react-router";
import {
	CommitHistoryPage,
	listBranchesFn,
	listCommitsFn,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/repositories/$name/tree/$branch/commits/",
)({
	loader: ({ params }) =>
		Promise.all([
			listCommitsFn({
				data: { name: params.name, ref: params.branch },
			}),
			listBranchesFn({ data: { name: params.name } }),
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
		const { name } = Route.useParams();
		const { commits, branches, selectedBranch } = Route.useLoaderData();
		return (
			<CommitHistoryPage
				name={name}
				commits={commits}
				branches={branches}
				selectedBranch={selectedBranch}
			/>
		);
	},
});
