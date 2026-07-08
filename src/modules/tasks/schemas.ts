import "#/platform/http/openapi-zod";
import { z } from "zod";
import { organizationNameSchema } from "#/modules/organizations";

const MAX_BOARD_KEY_LENGTH = 20;
const MAX_NAME_LENGTH = 100;
const MAX_BOARD_DESCRIPTION_LENGTH = 500;
const MAX_CARD_TITLE_LENGTH = 200;
const MAX_CARD_DESCRIPTION_LENGTH = 5000;

export const taskBoardKeySchema = z
	.string()
	.trim()
	.transform((value) => value.toUpperCase())
	.pipe(
		z
			.string()
			.min(1, "Board key is required")
			.max(MAX_BOARD_KEY_LENGTH, "Board key is too long")
			.regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, "Invalid board key"),
	);

export const taskPublicIdSchema = z
	.string()
	.trim()
	.transform((value) => value.toUpperCase())
	.pipe(
		z
			.string()
			.min(1, "Task ID is required")
			.regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+$/, "Invalid task ID"),
	);

const nonEmptyName = (message: string) =>
	z.string().trim().min(1, message).max(MAX_NAME_LENGTH);

export const createTaskBoardSchema = z.object({
	key: taskBoardKeySchema,
	name: nonEmptyName("Board name is required"),
	description: z
		.string()
		.trim()
		.max(MAX_BOARD_DESCRIPTION_LENGTH)
		.optional()
		.default(""),
});

export const updateTaskBoardSchema = z
	.object({
		name: nonEmptyName("Board name is required").optional(),
		description: z.string().trim().max(MAX_BOARD_DESCRIPTION_LENGTH).optional(),
	})
	.refine(
		(value) => value.name !== undefined || value.description !== undefined,
		{
			message: "At least one field is required",
		},
	);

export const createTaskColumnSchema = z.object({
	name: nonEmptyName("Column name is required"),
	position: z.number().int().min(0).optional(),
});

export const updateTaskColumnSchema = z
	.object({
		name: nonEmptyName("Column name is required").optional(),
		position: z.number().int().min(0).optional(),
	})
	.refine((value) => value.name !== undefined || value.position !== undefined, {
		message: "At least one field is required",
	});

export const deleteTaskColumnSchema = z.object({
	targetColumnId: z.uuid().optional(),
});

export const createTaskCardSchema = z.object({
	columnId: z.uuid(),
	title: z
		.string()
		.trim()
		.min(1, "Card title is required")
		.max(MAX_CARD_TITLE_LENGTH),
	description: z
		.string()
		.trim()
		.max(MAX_CARD_DESCRIPTION_LENGTH)
		.optional()
		.default(""),
});

export const updateTaskCardSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, "Card title is required")
			.max(MAX_CARD_TITLE_LENGTH)
			.optional(),
		description: z.string().trim().max(MAX_CARD_DESCRIPTION_LENGTH).optional(),
		columnId: z.uuid().optional(),
		position: z.number().int().min(0).optional(),
	})
	.refine(
		(value) =>
			value.title !== undefined ||
			value.description !== undefined ||
			value.columnId !== undefined ||
			value.position !== undefined,
		{ message: "At least one field is required" },
	);

export const taskBoardLocatorSchema = z.object({
	organizationName: organizationNameSchema,
	boardKey: taskBoardKeySchema,
});

export const taskColumnLocatorSchema = taskBoardLocatorSchema.extend({
	columnId: z.uuid(),
});

export const taskCardLocatorSchema = taskBoardLocatorSchema.extend({
	taskPublicId: taskPublicIdSchema,
});

export const taskColumnResponseSchema = z.object({
	id: z.uuid(),
	boardId: z.uuid(),
	name: z.string(),
	position: z.number().int(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const taskCardResponseSchema = z.object({
	id: z.uuid(),
	boardId: z.uuid(),
	columnId: z.uuid(),
	publicId: taskPublicIdSchema,
	number: z.number().int(),
	title: z.string(),
	description: z.string(),
	position: z.number().int(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const taskBoardResponseSchema = z.object({
	id: z.uuid(),
	organizationName: organizationNameSchema,
	key: taskBoardKeySchema,
	name: z.string(),
	description: z.string(),
	lastTaskNumber: z.number().int(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const taskBoardDetailResponseSchema = taskBoardResponseSchema.extend({
	columns: z.array(taskColumnResponseSchema),
	cards: z.array(taskCardResponseSchema),
});

export type CreateTaskBoardInput = z.infer<typeof createTaskBoardSchema>;
export type UpdateTaskBoardInput = z.infer<typeof updateTaskBoardSchema>;
export type CreateTaskColumnInput = z.infer<typeof createTaskColumnSchema>;
export type UpdateTaskColumnInput = z.infer<typeof updateTaskColumnSchema>;
export type DeleteTaskColumnInput = z.infer<typeof deleteTaskColumnSchema>;
export type CreateTaskCardInput = z.infer<typeof createTaskCardSchema>;
export type UpdateTaskCardInput = z.infer<typeof updateTaskCardSchema>;
export type TaskBoard = z.infer<typeof taskBoardResponseSchema>;
export type TaskBoardDetail = z.infer<typeof taskBoardDetailResponseSchema>;
export type TaskColumn = z.infer<typeof taskColumnResponseSchema>;
export type TaskCard = z.infer<typeof taskCardResponseSchema>;
