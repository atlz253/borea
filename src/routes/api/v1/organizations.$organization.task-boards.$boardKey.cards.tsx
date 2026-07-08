import { createFileRoute } from "@tanstack/react-router";
import { createTaskCardFn, createTaskCardSchema } from "#/modules/tasks";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/task-boards/$boardKey/cards",
)({
	server: {
		handlers: {
			POST: async ({ params, request }) =>
				handleApiRequest(async () => {
					const body = await parseJsonBody(request, createTaskCardSchema);
					return Response.json(
						await createTaskCardFn({
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
