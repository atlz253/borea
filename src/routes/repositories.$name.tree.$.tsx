import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/tree/$")({
	loader: ({ params }) =>
		Promise.all([
			listRepositoryFilesFn({
				data: { name: params.name, path: params._splat ?? "" },
			}),
			countCommitsFn({ data: { name: params.name } }),
			listBranchesFn({ data: { name: params.name } }),
		]).then(([entries, commitCount, branches]) => ({
			entries,
			commitCount,
			activeBranch: branches.find((b: { isHead: boolean }) => b.isHead)?.name,
		})),
	component: () => {
		const { name, _splat } = Route.useParams();
		const { entries, commitCount, activeBranch } = Route.useLoaderData();
		return (
			<RepositoryPage
				name={name}
				path={_splat ?? ""}
				entries={entries}
				commitCount={commitCount}
				activeBranch={activeBranch}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
