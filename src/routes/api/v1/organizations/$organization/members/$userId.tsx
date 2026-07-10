import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	organizationNameSchema,
	removeOrganizationMemberFn,
	updateOrganizationMemberRoleFn,
	updateOrganizationMemberRoleSchema,
} from "#/modules/organizations";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/members/$userId",
)({
	server: {
		handlers: {
			PATCH: async ({ params, request }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const userId = z.uuid().parse(params.userId);
					const input = await parseJsonBody(
						request,
						updateOrganizationMemberRoleSchema,
					);
					return Response.json(
						await updateOrganizationMemberRoleFn({
							data: { organizationName, userId, role: input.role },
						}),
					);
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const userId = z.uuid().parse(params.userId);
					await removeOrganizationMemberFn({
						data: { organizationName, userId },
					});
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
