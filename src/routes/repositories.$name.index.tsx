import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/")({
	loader: ({ params }) =>
		Promise.all([
			listRepositoryFilesFn({ data: { name: params.name } }),
			countCommitsFn({ data: { name: params.name } }),
			listBranchesFn({ data: { name: params.name } }),
		]).then(([entries, commitCount, branches]) => ({
			entries,
			commitCount,
			activeBranch: branches.find((b: { isHead: boolean }) => b.isHead)?.name,
		})),
	component: () => {
		const { name } = Route.useParams();
		const { entries, commitCount, activeBranch } = Route.useLoaderData();
		return (
			<RepositoryPage
				name={name}
				path=""
				entries={entries}
				commitCount={commitCount}
				activeBranch={activeBranch}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
