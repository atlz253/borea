import { createFileRoute } from "@tanstack/react-router";
import { requireCurrentUserFn } from "#/modules/auth";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute("/api/v1/auth/me")({
	server: {
		handlers: {
			GET: async () =>
				handleApiRequest(async () =>
					Response.json(await requireCurrentUserFn()),
				),
		},
	},
	component: () => null,
});
