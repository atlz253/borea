import { createFileRoute } from "@tanstack/react-router";
import {
	listRepositoryFilesFn,
	RepositoryError,
	RepositoryPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/tree/$")({
	loader: ({ params }) =>
		listRepositoryFilesFn({
			data: { name: params.name, path: params._splat ?? "" },
		}),
	component: () => {
		const { name, _splat } = Route.useParams();
		const entries = Route.useLoaderData();
		return <RepositoryPage name={name} path={_splat ?? ""} entries={entries} />;
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
