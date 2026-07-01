import { createFileRoute } from "@tanstack/react-router";
import {
	deleteRepositoryApiFn,
	getRepositoryFn,
	repoNameSchema,
} from "#/modules/repositories";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute("/api/v1/repositories/$name")({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const name = repoNameSchema.parse(params.name);
					return Response.json(await getRepositoryFn({ data: { name } }));
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					const name = repoNameSchema.parse(params.name);
					await deleteRepositoryApiFn({ data: { name } });
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
