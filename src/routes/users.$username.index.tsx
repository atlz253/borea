import { createFileRoute } from "@tanstack/react-router";
import {
	listUserRepositoriesFn,
	RepositoriesPage,
} from "#/modules/repositories";

export const Route = createFileRoute("/users/$username/")({
	loader: ({ params }) =>
		listUserRepositoriesFn({ data: { userName: params.username } }),
	component: () => {
		const { username } = Route.useParams();
		return (
			<RepositoriesPage
				userName={username}
				repositories={Route.useLoaderData()}
			/>
		);
	},
});
