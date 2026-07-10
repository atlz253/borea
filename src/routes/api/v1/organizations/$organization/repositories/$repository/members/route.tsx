import { createFileRoute } from "@tanstack/react-router";
import {
	listRepositoryMembersFn,
	organizationNameSchema,
} from "#/modules/organizations";
import { repoNameSchema } from "#/modules/repositories";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/repositories/$repository/members",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () => {
					const organizationName = organizationNameSchema.parse(
						params.organization,
					);
					const repositoryName = repoNameSchema.parse(params.repository);
					return Response.json(
						await listRepositoryMembersFn({
							data: { organizationName, repositoryName },
						}),
					);
				}),
		},
	},
	component: () => null,
});
