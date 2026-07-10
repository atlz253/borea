import { createFileRoute } from "@tanstack/react-router";
import { organizationNameSchema } from "#/modules/organizations";
import {
	deleteRepositoryApiFn,
	getRepositoryFn,
	repoNameSchema,
} from "#/modules/repositories";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/repositories/$repository",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const name = repoNameSchema.parse(params.repository);
					return Response.json(
						await getRepositoryFn({ data: { organizationName, name } }),
					);
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const name = repoNameSchema.parse(params.repository);
					await deleteRepositoryApiFn({
						data: { organizationName, name },
					});
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
