import { createFileRoute } from "@tanstack/react-router";
import {
	getPullRequestSchema,
	mergePullRequestBodySchema,
	mergePullRequestFn,
} from "#/modules/pull-requests";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/repositories/$repository/pull-requests/$pullId/merge",
)({
	server: {
		handlers: {
			POST: async ({ params, request }) =>
				handleApiRequest(async () => {
					const input = getPullRequestSchema.parse({
						organizationName: params.organization,
						repoName: params.repository,
						id: Number(params.pullId),
					});
					const body = await parseJsonBody(request, mergePullRequestBodySchema);
					return Response.json(
						await mergePullRequestFn({ data: { ...input, ...body } }),
					);
				}),
		},
	},
	component: () => null,
});
