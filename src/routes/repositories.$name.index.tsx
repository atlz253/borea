import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	listBranchesFn,
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/")({
	loader: async ({ params }) => {
		const branches = await listBranchesFn({
			data: { name: params.name },
		});
		const defaultBranch = branches.find(
			(b: { isHead: boolean }) => b.isHead,
		)?.name;

		if (!defaultBranch) {
			const entries = await listRepositoryFilesFn({
				data: { name: params.name },
			});
			return { entries, commitCount: 0, branches: [], selectedBranch: "" };
		}

		throw redirect({
			to: "/repositories/$name/tree/$branch",
			params: {
				name: params.name,
				branch: encodeURIComponent(defaultBranch),
			},
		});
	},
	component: () => {
		const { name } = Route.useParams();
		const { entries, commitCount, branches, selectedBranch } =
			Route.useLoaderData();
		return (
			<RepositoryPage
				name={name}
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
