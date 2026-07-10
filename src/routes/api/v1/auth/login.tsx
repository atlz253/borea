import { createFileRoute } from "@tanstack/react-router";
import { loginFn, loginSchema } from "#/modules/auth";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute("/api/v1/auth/login")({
	server: {
		handlers: {
			POST: async ({ request }) =>
				handleApiRequest(async () => {
					const input = await parseJsonBody(request, loginSchema);
					return Response.json(await loginFn({ data: input }));
				}),
		},
	},
	component: () => null,
});
