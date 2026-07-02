import { createFileRoute } from "@tanstack/react-router";
import {
	getOrganizationFn,
	organizationNameSchema,
} from "#/modules/organizations";
import { handleApiRequest } from "#/platform/http";

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
		},
	},
	component: () => null,
});
