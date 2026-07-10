import { createFileRoute } from "@tanstack/react-router";
import {
	inviteOrganizationMemberFn,
	inviteOrganizationMemberSchema,
	listOrganizationMembersFn,
	organizationNameSchema,
} from "#/modules/organizations";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/members",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					return Response.json(
						await listOrganizationMembersFn({
							data: { organizationName },
						}),
					);
				}),
			POST: async ({ params, request }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const input = await parseJsonBody(
						request,
						inviteOrganizationMemberSchema,
					);
					return Response.json(
						await inviteOrganizationMemberFn({
							data: { organizationName, email: input.email },
						}),
						{ status: 201 },
					);
				}),
		},
	},
	component: () => null,
});
