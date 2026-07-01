import { createFileRoute } from "@tanstack/react-router";
import { listRepositoriesFn } from "#/modules/repositories";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute("/api/v1/repositories")({
	server: {
		handlers: {
			GET: async () =>
				handleApiRequest(async () => Response.json(await listRepositoriesFn())),
		},
	},
	component: () => null,
});
