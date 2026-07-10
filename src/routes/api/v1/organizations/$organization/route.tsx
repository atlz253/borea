import { createFileRoute } from "@tanstack/react-router";
import {
	deleteOrganizationFn,
	getOrganizationFn,
	organizationNameSchema,
	updateOrganizationFn,
	updateOrganizationSchema,
} from "#/modules/organizations";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute("/api/v1/organizations/$organization")({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					return Response.json(
						await getOrganizationFn({ data: { organizationName } }),
					);
				}),
			PATCH: async ({ params, request }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const input = await parseJsonBody(request, updateOrganizationSchema);
					return Response.json(
						await updateOrganizationFn({
							data: { organizationName, description: input.description },
						}),
					);
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					await deleteOrganizationFn({ data: { organizationName } });
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
