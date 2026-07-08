import { NotFoundError } from "#/platform/errors";
import type { PrismaTaskStore } from "./prisma-task.store";
import type {
	CreateTaskBoardInput,
	CreateTaskCardInput,
	CreateTaskColumnInput,
	DeleteTaskColumnInput,
	TaskBoard,
	TaskBoardDetail,
	TaskCard,
	TaskColumn,
	UpdateTaskBoardInput,
	UpdateTaskCardInput,
	UpdateTaskColumnInput,
} from "./schemas";

export function createTaskService(store: PrismaTaskStore) {
	return {
		listBoards(organizationName: string): Promise<TaskBoard[]> {
			return store.listBoards(organizationName);
		},
		async getBoard(
			organizationName: string,
			boardKey: string,
		): Promise<TaskBoardDetail> {
			const board = await store.getBoard(organizationName, boardKey);
			if (!board) {
				throw new NotFoundError(`Task board "${boardKey}" not found`);
			}
			return board;
		},
		async getCard(
			organizationName: string,
			boardKey: string,
			taskPublicId: string,
		): Promise<TaskCard> {
			const card = await store.getCard(
				organizationName,
				boardKey,
				taskPublicId,
			);
			if (!card) {
				throw new NotFoundError(`Task card "${taskPublicId}" not found`);
			}
			return card;
		},
		createBoard(
			organizationName: string,
			input: CreateTaskBoardInput,
		): Promise<TaskBoardDetail> {
			return store.createBoard(organizationName, input);
		},
		updateBoard(
			organizationName: string,
			boardKey: string,
			input: UpdateTaskBoardInput,
		): Promise<TaskBoard> {
			return store.updateBoard(organizationName, boardKey, input);
		},
		deleteBoard(organizationName: string, boardKey: string): Promise<void> {
			return store.deleteBoard(organizationName, boardKey);
		},
		createColumn(
			organizationName: string,
			boardKey: string,
			input: CreateTaskColumnInput,
		): Promise<TaskColumn> {
			return store.createColumn(organizationName, boardKey, input);
		},
		updateColumn(
			organizationName: string,
			boardKey: string,
			columnId: string,
			input: UpdateTaskColumnInput,
		): Promise<TaskColumn> {
			return store.updateColumn(organizationName, boardKey, columnId, input);
		},
		deleteColumn(
			organizationName: string,
			boardKey: string,
			columnId: string,
			input: DeleteTaskColumnInput,
		): Promise<void> {
			return store.deleteColumn(
				organizationName,
				boardKey,
				columnId,
				input.targetColumnId,
			);
		},
		createCard(
			organizationName: string,
			boardKey: string,
			input: CreateTaskCardInput,
		): Promise<TaskCard> {
			return store.createCard(organizationName, boardKey, input);
		},
		updateCard(
			organizationName: string,
			boardKey: string,
			taskPublicId: string,
			input: UpdateTaskCardInput,
		): Promise<TaskCard> {
			return store.updateCard(organizationName, boardKey, taskPublicId, input);
		},
		deleteCard(
			organizationName: string,
			boardKey: string,
			taskPublicId: string,
		): Promise<void> {
			return store.deleteCard(organizationName, boardKey, taskPublicId);
		},
	};
}
