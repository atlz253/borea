import { createFileRoute } from "@tanstack/react-router";
import {
	listPullRequestsFn,
	listPullRequestsSchema,
} from "#/modules/pull-requests";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/repositories/$repository/pull-requests",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const input = listPullRequestsSchema.parse({
						organizationName: params.organization,
						repoName: params.repository,
					});
					return Response.json(await listPullRequestsFn({ data: input }));
				}),
		},
	},
	component: () => null,
});
