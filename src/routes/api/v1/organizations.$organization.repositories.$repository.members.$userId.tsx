import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	organizationNameSchema,
	removeRepositoryMemberFn,
	setRepositoryMemberRoleFn,
	setRepositoryMemberRoleSchema,
} from "#/modules/organizations";
import { repoNameSchema } from "#/modules/repositories";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/repositories/$repository/members/$userId",
)({
	server: {
		handlers: {
			PUT: async ({ params, request }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const repositoryName = repoNameSchema.parse(params.repository);
					const userId = z.uuid().parse(params.userId);
					const input = await parseJsonBody(
						request,
						setRepositoryMemberRoleSchema,
					);
					return Response.json(
						await setRepositoryMemberRoleFn({
							data: {
								organizationName,
								repositoryName,
								userId,
								role: input.role,
							},
						}),
					);
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const repositoryName = repoNameSchema.parse(params.repository);
					const userId = z.uuid().parse(params.userId);
					await removeRepositoryMemberFn({
						data: { organizationName, repositoryName, userId },
					});
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
