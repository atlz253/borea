import { createFileRoute } from "@tanstack/react-router";
import {
	createOrganizationFn,
	createOrganizationSchema,
	listOrganizationsFn,
} from "#/modules/organizations";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute("/api/v1/organizations")({
	server: {
		handlers: {
			GET: async () =>
				handleApiRequest(async () =>
					Response.json(await listOrganizationsFn()),
				),
			POST: async ({ request }) =>
				handleApiRequest(async () => {
					const input = await parseJsonBody(request, createOrganizationSchema);
					return Response.json(await createOrganizationFn({ data: input }), {
						status: 201,
					});
				}),
		},
	},
	component: () => null,
});
