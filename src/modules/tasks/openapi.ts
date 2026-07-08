import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { organizationNameSchema } from "#/modules/organizations";
import { apiErrorSchema } from "#/platform/http";
import {
	createTaskBoardSchema,
	createTaskCardSchema,
	createTaskColumnSchema,
	deleteTaskColumnSchema,
	taskBoardDetailResponseSchema,
	taskBoardKeySchema,
	taskBoardResponseSchema,
	taskCardResponseSchema,
	taskColumnResponseSchema,
	taskPublicIdSchema,
	updateTaskBoardSchema,
	updateTaskCardSchema,
	updateTaskColumnSchema,
} from "./schemas";

const jsonContent = (schema: z.ZodType) => ({
	"application/json": { schema },
});

export function registerTaskOpenApi(registry: OpenAPIRegistry): void {
	const error = registry.register("TaskApiError", apiErrorSchema);
	const board = registry.register("TaskBoard", taskBoardResponseSchema);
	const boardDetail = registry.register(
		"TaskBoardDetail",
		taskBoardDetailResponseSchema,
	);
	const boards = registry.register(
		"TaskBoardList",
		z.array(taskBoardResponseSchema),
	);
	const column = registry.register("TaskColumn", taskColumnResponseSchema);
	const card = registry.register("TaskCard", taskCardResponseSchema);
	const organizationParams = z.object({ organization: organizationNameSchema });
	const boardParams = organizationParams.extend({
		boardKey: taskBoardKeySchema,
	});
	const columnParams = boardParams.extend({ columnId: z.uuid() });
	const cardParams = boardParams.extend({ taskPublicId: taskPublicIdSchema });

	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}/task-boards",
		tags: ["Task boards"],
		summary: "List task boards",
		request: { params: organizationParams },
		responses: {
			200: { description: "Task board list", content: jsonContent(boards) },
			404: {
				description: "Organization not found",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "post",
		path: "/api/v1/organizations/{organization}/task-boards",
		tags: ["Task boards"],
		summary: "Create task board",
		request: {
			params: organizationParams,
			body: { content: jsonContent(createTaskBoardSchema) },
		},
		responses: {
			201: {
				description: "Task board created",
				content: jsonContent(boardDetail),
			},
			400: { description: "Invalid input", content: jsonContent(error) },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			409: {
				description: "Task board already exists",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}",
		tags: ["Task boards"],
		summary: "Get task board",
		request: { params: boardParams },
		responses: {
			200: {
				description: "Task board detail",
				content: jsonContent(boardDetail),
			},
			404: { description: "Task board not found", content: jsonContent(error) },
		},
	});
	registry.registerPath({
		method: "patch",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}",
		tags: ["Task boards"],
		summary: "Update task board",
		request: {
			params: boardParams,
			body: { content: jsonContent(updateTaskBoardSchema) },
		},
		responses: {
			200: { description: "Task board updated", content: jsonContent(board) },
			400: { description: "Invalid input", content: jsonContent(error) },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: { description: "Task board not found", content: jsonContent(error) },
		},
	});
	registry.registerPath({
		method: "delete",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}",
		tags: ["Task boards"],
		summary: "Delete task board",
		request: { params: boardParams },
		responses: {
			204: { description: "Task board deleted" },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: { description: "Task board not found", content: jsonContent(error) },
		},
	});
	registry.registerPath({
		method: "post",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}/columns",
		tags: ["Task columns"],
		summary: "Create task column",
		request: {
			params: boardParams,
			body: { content: jsonContent(createTaskColumnSchema) },
		},
		responses: {
			201: { description: "Task column created", content: jsonContent(column) },
			400: { description: "Invalid input", content: jsonContent(error) },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: { description: "Task board not found", content: jsonContent(error) },
		},
	});
	registry.registerPath({
		method: "patch",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}/columns/{columnId}",
		tags: ["Task columns"],
		summary: "Update task column",
		request: {
			params: columnParams,
			body: { content: jsonContent(updateTaskColumnSchema) },
		},
		responses: {
			200: { description: "Task column updated", content: jsonContent(column) },
			400: { description: "Invalid input", content: jsonContent(error) },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: {
				description: "Task column not found",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "delete",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}/columns/{columnId}",
		tags: ["Task columns"],
		summary: "Delete task column",
		request: {
			params: columnParams,
			body: { content: jsonContent(deleteTaskColumnSchema) },
		},
		responses: {
			204: { description: "Task column deleted" },
			400: { description: "Invalid input", content: jsonContent(error) },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: {
				description: "Task column not found",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "post",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}/cards",
		tags: ["Task cards"],
		summary: "Create task card",
		request: {
			params: boardParams,
			body: { content: jsonContent(createTaskCardSchema) },
		},
		responses: {
			201: { description: "Task card created", content: jsonContent(card) },
			400: { description: "Invalid input", content: jsonContent(error) },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: {
				description: "Task board or column not found",
				content: jsonContent(error),
			},
		},
	});
	registry.registerPath({
		method: "get",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}",
		tags: ["Task cards"],
		summary: "Get task card",
		request: { params: cardParams },
		responses: {
			200: { description: "Task card", content: jsonContent(card) },
			404: { description: "Task card not found", content: jsonContent(error) },
		},
	});
	registry.registerPath({
		method: "patch",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}",
		tags: ["Task cards"],
		summary: "Update task card",
		request: {
			params: cardParams,
			body: { content: jsonContent(updateTaskCardSchema) },
		},
		responses: {
			200: { description: "Task card updated", content: jsonContent(card) },
			400: { description: "Invalid input", content: jsonContent(error) },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: { description: "Task card not found", content: jsonContent(error) },
			409: { description: "Move conflict", content: jsonContent(error) },
		},
	});
	registry.registerPath({
		method: "delete",
		path: "/api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}",
		tags: ["Task cards"],
		summary: "Delete task card",
		request: { params: cardParams },
		responses: {
			204: { description: "Task card deleted" },
			403: {
				description: "Insufficient permission",
				content: jsonContent(error),
			},
			404: { description: "Task card not found", content: jsonContent(error) },
		},
	});
}
