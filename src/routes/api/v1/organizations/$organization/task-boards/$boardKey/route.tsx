import { createFileRoute } from "@tanstack/react-router";
import {
	deleteTaskBoardFn,
	getTaskBoardFn,
	updateTaskBoardFn,
	updateTaskBoardSchema,
} from "#/modules/tasks";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/task-boards/$boardKey",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () =>
					Response.json(
						await getTaskBoardFn({
							data: {
								organizationName: params.organization,
								boardKey: params.boardKey,
							},
						}),
					),
				),
			PATCH: async ({ params, request }) =>
				handleApiRequest(async () => {
					const body = await parseJsonBody(request, updateTaskBoardSchema);
					return Response.json(
						await updateTaskBoardFn({
							data: {
								organizationName: params.organization,
								boardKey: params.boardKey,
								...body,
							},
						}),
					);
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					await deleteTaskBoardFn({
						data: {
							organizationName: params.organization,
							boardKey: params.boardKey,
						},
					});
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
