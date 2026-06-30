import { createFileRoute } from "@tanstack/react-router";
import {
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/")({
	loader: ({ params }) =>
		listRepositoryFilesFn({ data: { name: params.name } }),
	component: () => {
		const { name } = Route.useParams();
		const entries = Route.useLoaderData();
		return <RepositoryPage name={name} path="" entries={entries} />;
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
