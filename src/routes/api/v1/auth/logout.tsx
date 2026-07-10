import { createFileRoute } from "@tanstack/react-router";
import { logoutFn } from "#/modules/auth";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute("/api/v1/auth/logout")({
	server: {
		handlers: {
			POST: async () =>
				handleApiRequest(async () => {
					await logoutFn();
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
