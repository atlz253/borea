import { createFileRoute } from "@tanstack/react-router";
import {
	createGitTokenFn,
	createGitTokenSchema,
	listGitTokensFn,
} from "#/modules/auth";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute("/api/v1/auth/git-tokens")({
	server: {
		handlers: {
			GET: async () =>
				handleApiRequest(async () =>
					Response.json(await listGitTokensFn()),
				),
			POST: async ({ request }) =>
				handleApiRequest(async () => {
					const input = await parseJsonBody(request, createGitTokenSchema);
					return Response.json(await createGitTokenFn({ data: input }), {
						status: 201,
					});
				}),
		},
	},
	component: () => null,
});
