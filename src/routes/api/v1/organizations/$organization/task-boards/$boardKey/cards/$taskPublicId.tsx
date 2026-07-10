import { createFileRoute } from "@tanstack/react-router";
import {
	deleteTaskCardFn,
	getTaskCardFn,
	updateTaskCardFn,
	updateTaskCardSchema,
} from "#/modules/tasks";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

export const Route = createFileRoute(
	"/api/v1/organizations/$organization/task-boards/$boardKey/cards/$taskPublicId",
)({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () =>
					Response.json(
						await getTaskCardFn({
							data: {
								organizationName: params.organization,
								boardKey: params.boardKey,
								taskPublicId: params.taskPublicId,
							},
						}),
					),
				),
			PATCH: async ({ params, request }) =>
				handleApiRequest(async () => {
					const body = await parseJsonBody(request, updateTaskCardSchema);
					return Response.json(
						await updateTaskCardFn({
							data: {
								organizationName: params.organization,
								boardKey: params.boardKey,
								taskPublicId: params.taskPublicId,
								...body,
							},
						}),
					);
				}),
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					await deleteTaskCardFn({
						data: {
							organizationName: params.organization,
							boardKey: params.boardKey,
							taskPublicId: params.taskPublicId,
						},
					});
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
