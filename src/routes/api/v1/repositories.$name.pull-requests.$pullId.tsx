import { createFileRoute } from "@tanstack/react-router";
import {
	getPullRequestFn,
	getPullRequestSchema,
} from "#/modules/pull-requests";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/repositories/$name/pull-requests/$pullId",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const input = getPullRequestSchema.parse({
						repoName: params.name,
						id: Number(params.pullId),
					});
					return Response.json(await getPullRequestFn({ data: input }));
				}),
		},
	},
	component: () => null,
});
