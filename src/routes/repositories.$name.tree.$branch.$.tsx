import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/tree/$branch/$")({
	loader: ({ params }) =>
		Promise.all([
			listRepositoryFilesFn({
				data: {
					name: params.name,
					path: params._splat ?? "",
					ref: params.branch,
				},
			}),
			countCommitsFn({ data: { name: params.name, ref: params.branch } }),
			listBranchesFn({ data: { name: params.name } }),
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
		const { name, _splat } = Route.useParams();
		const { entries, commitCount, branches, selectedBranch } =
			Route.useLoaderData();
		return (
			<RepositoryPage
				name={name}
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
