import { createFileRoute } from "@tanstack/react-router";
import { generateOpenApiDocument } from "#/openapi";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute("/api/v1/openapi.json")({
	server: {
		handlers: {
			GET: async () =>
				handleApiRequest(async () => Response.json(generateOpenApiDocument())),
		},
	},
	component: () => null,
});
