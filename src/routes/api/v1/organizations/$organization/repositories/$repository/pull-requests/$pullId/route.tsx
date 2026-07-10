import { createFileRoute } from "@tanstack/react-router";
import {
	getPullRequestFn,
	getPullRequestSchema,
} from "#/modules/pull-requests";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/repositories/$repository/pull-requests/$pullId",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const input = getPullRequestSchema.parse({
						organizationName: params.organization,
						repoName: params.repository,
						id: Number(params.pullId),
					});
					return Response.json(await getPullRequestFn({ data: input }));
				}),
		},
	},
	component: () => null,
});
