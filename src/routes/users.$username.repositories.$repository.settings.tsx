import { createFileRoute } from "@tanstack/react-router";
import {
	getUserRepositoryAccessFn,
	RepositorySettingsPage,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository/settings",
)({
	loader: ({ params }) =>
		getUserRepositoryAccessFn({
			data: { userName: params.username, name: params.repository },
		}),
	component: () => {
		const { username, repository } = Route.useParams();
		const access = Route.useLoaderData();
		return (
			<RepositorySettingsPage
				access={access}
				userName={username}
				name={repository}
			/>
		);
	},
});
