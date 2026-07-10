import { createFileRoute } from "@tanstack/react-router";
import { createTaskColumnFn, createTaskColumnSchema } from "#/modules/tasks";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/task-boards/$boardKey/columns",
)({
	server: {
		handlers: {
			POST: async ({ params, request }) =>
				handleApiRequest(async () => {
					const body = await parseJsonBody(request, createTaskColumnSchema);
					return Response.json(
						await createTaskColumnFn({
							data: {
								organizationName: params.organization,
								boardKey: params.boardKey,
								...body,
							},
						}),
						{ status: 201 },
					);
				}),
		},
	},
	component: () => null,
});
