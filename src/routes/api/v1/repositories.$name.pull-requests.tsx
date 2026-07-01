import { createFileRoute } from "@tanstack/react-router";
import {
	listPullRequestsFn,
	listPullRequestsSchema,
} from "#/modules/pull-requests";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/repositories/$name/pull-requests",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const input = listPullRequestsSchema.parse({
						repoName: params.name,
					});
					return Response.json(await listPullRequestsFn({ data: input }));
				}),
		},
	},
	component: () => null,
});
