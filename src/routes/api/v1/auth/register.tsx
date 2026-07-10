import { createFileRoute } from "@tanstack/react-router";
import { registerFn, registerSchema } from "#/modules/auth";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute("/api/v1/auth/register")({
	server: {
		handlers: {
			POST: async ({ request }) =>
				handleApiRequest(async () => {
					const input = await parseJsonBody(request, registerSchema);
					return Response.json(await registerFn({ data: input }));
				}),
		},
	},
	component: () => null,
});
