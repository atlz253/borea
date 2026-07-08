import { createFileRoute } from "@tanstack/react-router";
import {
	deleteTaskColumnFn,
	deleteTaskColumnSchema,
	updateTaskColumnFn,
	updateTaskColumnSchema,
} from "#/modules/tasks";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/task-boards/$boardKey/columns/$columnId",
)({
	server: {
		handlers: {
			PATCH: async ({ params, request }) =>
				handleApiRequest(async () => {
					const body = await parseJsonBody(request, updateTaskColumnSchema);
					return Response.json(
						await updateTaskColumnFn({
							data: {
								organizationName: params.organization,
								boardKey: params.boardKey,
								columnId: params.columnId,
								...body,
							},
						}),
					);
				}),
			DELETE: async ({ params, request }) =>
				handleApiRequest(async () => {
					const body = await parseJsonBody(request, deleteTaskColumnSchema);
					await deleteTaskColumnFn({
						data: {
							organizationName: params.organization,
							boardKey: params.boardKey,
							columnId: params.columnId,
							...body,
						},
					});
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
