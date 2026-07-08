import { createServerFn } from "@tanstack/react-start";
import { assertSameOriginFn } from "#/modules/auth";
import { requireOrganizationPermissionFn } from "#/modules/organizations";
import {
	createTaskBoardSchema,
	createTaskCardSchema,
	createTaskColumnSchema,
	deleteTaskColumnSchema,
	taskBoardKeySchema,
	taskBoardLocatorSchema,
	taskCardLocatorSchema,
	taskColumnLocatorSchema,
	updateTaskBoardSchema,
	updateTaskCardSchema,
	updateTaskColumnSchema,
} from "../schemas";

async function requireTasks(
	organizationName: string,
	permission: "read" | "manageTasks",
) {
	await requireOrganizationPermissionFn({
		data: { organizationName, permission },
	});
}

export const listTaskBoardsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const input = data as { organizationName?: unknown };
		return taskBoardLocatorSchema.shape.organizationName.parse(
			input.organizationName,
		);
	})
	.handler(async ({ data }) => {
		await requireTasks(data, "read");
		const { taskService } = await import("./task.server");
		return taskService.listBoards(data);
	});

export const getTaskBoardFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => taskBoardLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		await requireTasks(data.organizationName, "read");
		const { taskService } = await import("./task.server");
		return taskService.getBoard(data.organizationName, data.boardKey);
	});

export const createTaskBoardFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const input = data as { organizationName?: unknown };
		return {
			organizationName: taskBoardLocatorSchema.shape.organizationName.parse(
				input.organizationName,
			),
			...createTaskBoardSchema.parse(data),
		};
	})
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		return taskService.createBoard(data.organizationName, data);
	});

export const updateTaskBoardFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const input = data as { organizationName?: unknown; boardKey?: unknown };
		return {
			organizationName: taskBoardLocatorSchema.shape.organizationName.parse(
				input.organizationName,
			),
			boardKey: taskBoardKeySchema.parse(input.boardKey),
			...updateTaskBoardSchema.parse(data),
		};
	})
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		return taskService.updateBoard(data.organizationName, data.boardKey, data);
	});

export const deleteTaskBoardFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => taskBoardLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		await taskService.deleteBoard(data.organizationName, data.boardKey);
	});

export const createTaskColumnFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => ({
		...taskBoardLocatorSchema.parse(data),
		...createTaskColumnSchema.parse(data),
	}))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		return taskService.createColumn(data.organizationName, data.boardKey, data);
	});

export const updateTaskColumnFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => ({
		...taskColumnLocatorSchema.parse(data),
		...updateTaskColumnSchema.parse(data),
	}))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		return taskService.updateColumn(
			data.organizationName,
			data.boardKey,
			data.columnId,
			data,
		);
	});

export const deleteTaskColumnFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => ({
		...taskColumnLocatorSchema.parse(data),
		...deleteTaskColumnSchema.parse(data),
	}))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		await taskService.deleteColumn(
			data.organizationName,
			data.boardKey,
			data.columnId,
			data,
		);
	});

export const createTaskCardFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => ({
		...taskBoardLocatorSchema.parse(data),
		...createTaskCardSchema.parse(data),
	}))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		return taskService.createCard(data.organizationName, data.boardKey, data);
	});

export const getTaskCardFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => taskCardLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		await requireTasks(data.organizationName, "read");
		const { taskService } = await import("./task.server");
		return taskService.getCard(
			data.organizationName,
			data.boardKey,
			data.taskPublicId,
		);
	});

export const updateTaskCardFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => ({
		...taskCardLocatorSchema.parse(data),
		...updateTaskCardSchema.parse(data),
	}))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		return taskService.updateCard(
			data.organizationName,
			data.boardKey,
			data.taskPublicId,
			data,
		);
	});

export const deleteTaskCardFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => taskCardLocatorSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireTasks(data.organizationName, "manageTasks");
		const { taskService } = await import("./task.server");
		await taskService.deleteCard(
			data.organizationName,
			data.boardKey,
			data.taskPublicId,
		);
	});
