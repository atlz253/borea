import { createFileRoute } from "@tanstack/react-router";
import { listRepositoriesFn } from "#/modules/repositories";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/repositories",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () =>
					Response.json(
						await listRepositoriesFn({
							data: { organizationName: params.organization },
						}),
					),
				),
		},
	},
	component: () => null,
});
