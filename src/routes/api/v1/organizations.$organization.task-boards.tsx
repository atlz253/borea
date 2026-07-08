import { createFileRoute } from "@tanstack/react-router";
import {
	createTaskBoardFn,
	createTaskBoardSchema,
	listTaskBoardsFn,
} from "#/modules/tasks";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/task-boards",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () =>
					Response.json(
						await listTaskBoardsFn({
							data: { organizationName: params.organization },
						}),
					),
				),
			POST: async ({ params, request }) =>
				handleApiRequest(async () => {
					const body = await parseJsonBody(request, createTaskBoardSchema);
					return Response.json(
						await createTaskBoardFn({
							data: { organizationName: params.organization, ...body },
						}),
						{ status: 201 },
					);
				}),
		},
	},
	component: () => null,
});
