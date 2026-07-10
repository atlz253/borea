import { createFileRoute } from "@tanstack/react-router";
import { usernameSchema } from "#/modules/auth";
import {
	deleteRepositoryApiFn,
	getRepositoryFn,
	repoNameSchema,
} from "#/modules/repositories";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/users/$username/repositories/$repository",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const userName = usernameSchema.parse(params.username);
					const name = repoNameSchema.parse(params.repository);
					return Response.json(
						await getRepositoryFn({ data: { userName, name } }),
					);
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					const userName = usernameSchema.parse(params.username);
					const name = repoNameSchema.parse(params.repository);
					await deleteRepositoryApiFn({ data: { userName, name } });
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
