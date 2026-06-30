import { createFileRoute } from "@tanstack/react-router";
import {
	CommitHistoryPage,
	listBranchesFn,
	listCommitsFn,
	RepositoryError,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/commits")({
	loader: ({ params }) =>
		Promise.all([
			listCommitsFn({ data: { name: params.name } }),
			listBranchesFn({ data: { name: params.name } }),
		]).then(([commits, branches]) => ({ commits, branches })),
	component: () => {
		const { name } = Route.useParams();
		const { commits, branches } = Route.useLoaderData();
		return (
			<CommitHistoryPage name={name} commits={commits} branches={branches} />
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
