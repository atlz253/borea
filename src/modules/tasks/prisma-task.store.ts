import type { DatabaseProvider } from "#/platform/database";
import {
	ConflictError,
	NotFoundError,
	ValidationError,
} from "#/platform/errors";
import type {
	CreateTaskBoardInput,
	CreateTaskCardInput,
	CreateTaskColumnInput,
	TaskBoard,
	TaskBoardDetail,
	TaskCard,
	TaskColumn,
	UpdateTaskBoardInput,
	UpdateTaskCardInput,
	UpdateTaskColumnInput,
} from "./schemas";

const DEFAULT_COLUMNS = ["Backlog", "To do", "Doing", "Done"] as const;

type TxClient = Parameters<DatabaseProvider["transaction"]>[0] extends (
	tx: infer T,
) => Promise<unknown>
	? T
	: never;

type DbClient = ReturnType<DatabaseProvider["getClient"]>;
type Client = DbClient | TxClient;

type BoardRow = {
	id: string;
	organizationName: string;
	key: string;
	name: string;
	description: string | null;
	lastTaskNumber: number;
	createdAt: string;
	updatedAt: string;
};

type ColumnRow = {
	id: string;
	boardId: string;
	name: string;
	position: number;
	createdAt: string;
	updatedAt: string;
};

type CardRow = {
	id: string;
	boardId: string;
	columnId: string;
	publicId: string;
	number: number;
	title: string;
	description: string;
	position: number;
	createdAt: string;
	updatedAt: string;
};

function boardToResponse(row: BoardRow): TaskBoard {
	return {
		id: row.id,
		organizationName: row.organizationName,
		key: row.key,
		name: row.name,
		description: row.description ?? "",
		lastTaskNumber: row.lastTaskNumber,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function columnToResponse(row: ColumnRow): TaskColumn {
	return {
		id: row.id,
		boardId: row.boardId,
		name: row.name,
		position: row.position,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function cardToResponse(row: CardRow): TaskCard {
	return {
		id: row.id,
		boardId: row.boardId,
		columnId: row.columnId,
		publicId: row.publicId,
		number: row.number,
		title: row.title,
		description: row.description,
		position: row.position,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function detailToResponse(
	row: BoardRow & {
		columns: ColumnRow[];
		cards: CardRow[];
	},
): TaskBoardDetail {
	return {
		...boardToResponse(row),
		columns: row.columns.map(columnToResponse),
		cards: row.cards.map(cardToResponse),
	};
}

function prismaConflict(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

function clampPosition(position: number | undefined, length: number): number {
	if (position === undefined) {
		return length;
	}
	return Math.min(Math.max(position, 0), length);
}

async function normalizeColumns(
	client: Client,
	orderedIds: string[],
	now: string,
): Promise<void> {
	await Promise.all(
		orderedIds.map((id, position) =>
			client.taskColumn.update({
				where: { id },
				data: { position, updatedAt: now },
			}),
		),
	);
}

async function normalizeCards(
	client: Client,
	columnId: string,
	orderedIds: string[],
	now: string,
): Promise<void> {
	await Promise.all(
		orderedIds.map((id, position) =>
			client.taskCard.update({
				where: { id },
				data: { columnId, position, updatedAt: now },
			}),
		),
	);
}

function requireColumn(board: { columns: ColumnRow[] }, columnId: string) {
	const column = board.columns.find((item) => item.id === columnId);
	if (!column) throw new NotFoundError("Task column not found");
	return column;
}

function requireDeleteTarget(
	board: { columns: ColumnRow[] },
	columnId: string,
	targetColumnId?: string,
): string {
	if (!targetColumnId) {
		throw new ValidationError("targetColumnId is required");
	}
	if (targetColumnId === columnId) {
		throw new ValidationError("targetColumnId must be different");
	}
	requireColumn(board, targetColumnId);
	return targetColumnId;
}

function orderedCardIds(cards: CardRow[], columnId: string): string[] {
	return cards
		.filter((card) => card.columnId === columnId)
		.map((card) => card.id);
}

function movedCardIds(cards: CardRow[], columnId: string): string[] {
	return cards
		.filter((card) => card.columnId === columnId)
		.map((card) => card.id);
}

function requireCard(cards: CardRow[], taskPublicId: string): CardRow {
	const card = cards.find((item) => item.publicId === taskPublicId);
	if (!card) throw new NotFoundError(`Task card "${taskPublicId}" not found`);
	return card;
}

function requireColumnId(board: { columns: ColumnRow[] }, columnId: string) {
	if (!board.columns.some((column) => column.id === columnId)) {
		throw new NotFoundError("Task column not found");
	}
}

function sameColumnOrder(
	cards: CardRow[],
	card: CardRow,
	position: number | undefined,
): string[] {
	const orderedIds = orderedCardIds(cards, card.columnId).filter(
		(id) => id !== card.id,
	);
	orderedIds.splice(clampPosition(position, orderedIds.length), 0, card.id);
	return orderedIds;
}

function targetColumnOrder(
	cards: CardRow[],
	card: CardRow,
	columnId: string,
	position: number | undefined,
): string[] {
	const orderedIds = orderedCardIds(cards, columnId);
	orderedIds.splice(clampPosition(position, orderedIds.length), 0, card.id);
	return orderedIds;
}

export class PrismaTaskStore {
	constructor(private readonly db: DatabaseProvider) {}

	async listBoards(organizationName: string): Promise<TaskBoard[]> {
		const rows = await this.db.getClient().taskBoard.findMany({
			where: { organizationName },
			orderBy: { createdAt: "desc" },
		});
		return rows.map(boardToResponse);
	}

	async getBoard(
		organizationName: string,
		boardKey: string,
	): Promise<TaskBoardDetail | undefined> {
		const row = await this.db.getClient().taskBoard.findUnique({
			where: { organizationName_key: { organizationName, key: boardKey } },
			include: {
				columns: { orderBy: { position: "asc" } },
			},
		});
		if (!row) return undefined;
		const cards = await this.db.getClient().taskCard.findMany({
			where: { boardId: row.id },
			orderBy: [{ columnId: "asc" }, { position: "asc" }],
		});
		return detailToResponse({ ...row, cards });
	}

	async getCard(
		organizationName: string,
		boardKey: string,
		taskPublicId: string,
	): Promise<TaskCard | undefined> {
		const board = await this.db.getClient().taskBoard.findUnique({
			where: { organizationName_key: { organizationName, key: boardKey } },
			select: { id: true },
		});
		if (!board) return undefined;
		const row = await this.db.getClient().taskCard.findUnique({
			where: {
				boardId_publicId: { boardId: board.id, publicId: taskPublicId },
			},
		});
		return row ? cardToResponse(row) : undefined;
	}

	async createBoard(
		organizationName: string,
		input: CreateTaskBoardInput,
	): Promise<TaskBoardDetail> {
		const now = new Date().toISOString();
		try {
			return await this.db.transaction(async (tx) => {
				const board = await tx.taskBoard.create({
					data: {
						organizationName,
						key: input.key,
						name: input.name,
						description: input.description,
						createdAt: now,
						updatedAt: now,
					},
				});
				await tx.taskColumn.createMany({
					data: DEFAULT_COLUMNS.map((name, position) => ({
						boardId: board.id,
						name,
						position,
						createdAt: now,
						updatedAt: now,
					})),
				});
				const detail = await tx.taskBoard.findUniqueOrThrow({
					where: { id: board.id },
					include: {
						columns: { orderBy: { position: "asc" } },
					},
				});
				return detailToResponse({ ...detail, cards: [] });
			});
		} catch (error) {
			if (prismaConflict(error)) {
				throw new ConflictError("Task board already exists");
			}
			throw error;
		}
	}

	async updateBoard(
		organizationName: string,
		boardKey: string,
		input: UpdateTaskBoardInput,
	): Promise<TaskBoard> {
		const row = await this.db.getClient().taskBoard.update({
			where: { organizationName_key: { organizationName, key: boardKey } },
			data: {
				...(input.name === undefined ? {} : { name: input.name }),
				...(input.description === undefined
					? {}
					: { description: input.description }),
				updatedAt: new Date().toISOString(),
			},
		});
		return boardToResponse(row);
	}

	async deleteBoard(organizationName: string, boardKey: string): Promise<void> {
		await this.db.getClient().taskBoard.delete({
			where: { organizationName_key: { organizationName, key: boardKey } },
		});
	}

	async createColumn(
		organizationName: string,
		boardKey: string,
		input: CreateTaskColumnInput,
	): Promise<TaskColumn> {
		const now = new Date().toISOString();
		return this.db.transaction(async (tx) => {
			const board = await tx.taskBoard.findUnique({
				where: { organizationName_key: { organizationName, key: boardKey } },
				include: { columns: { orderBy: { position: "asc" } } },
			});
			if (!board) throw new NotFoundError(`Task board "${boardKey}" not found`);
			const position = clampPosition(input.position, board.columns.length);
			const orderedIds = board.columns.map((column) => column.id);
			const column = await tx.taskColumn.create({
				data: {
					boardId: board.id,
					name: input.name,
					position,
					createdAt: now,
					updatedAt: now,
				},
			});
			orderedIds.splice(position, 0, column.id);
			await normalizeColumns(tx, orderedIds, now);
			return columnToResponse({ ...column, position });
		});
	}

	async updateColumn(
		organizationName: string,
		boardKey: string,
		columnId: string,
		input: UpdateTaskColumnInput,
	): Promise<TaskColumn> {
		const now = new Date().toISOString();
		return this.db.transaction(async (tx) => {
			const board = await tx.taskBoard.findUnique({
				where: { organizationName_key: { organizationName, key: boardKey } },
				include: { columns: { orderBy: { position: "asc" } } },
			});
			if (!board) throw new NotFoundError(`Task board "${boardKey}" not found`);
			const column = board.columns.find((item) => item.id === columnId);
			if (!column) throw new NotFoundError("Task column not found");
			if (input.position !== undefined) {
				const orderedIds = board.columns
					.map((item) => item.id)
					.filter((id) => id !== columnId);
				orderedIds.splice(
					clampPosition(input.position, orderedIds.length),
					0,
					columnId,
				);
				await normalizeColumns(tx, orderedIds, now);
			}
			const updated = await tx.taskColumn.update({
				where: { id: columnId },
				data: {
					...(input.name === undefined ? {} : { name: input.name }),
					updatedAt: now,
				},
			});
			return columnToResponse(updated);
		});
	}

	async deleteColumn(
		organizationName: string,
		boardKey: string,
		columnId: string,
		targetColumnId?: string,
	): Promise<void> {
		const now = new Date().toISOString();
		await this.db.transaction(async (tx) => {
			const board = await tx.taskBoard.findUnique({
				where: { organizationName_key: { organizationName, key: boardKey } },
				include: {
					columns: { orderBy: { position: "asc" } },
				},
			});
			if (!board) throw new NotFoundError(`Task board "${boardKey}" not found`);
			const cards = await tx.taskCard.findMany({
				where: { boardId: board.id },
				orderBy: { position: "asc" },
			});
			if (board.columns.length <= 1) {
				throw new ValidationError("Cannot delete the last column");
			}
			requireColumn(board, columnId);
			const movedIds = movedCardIds(cards, columnId);
			if (movedIds.length > 0) {
				const targetId = requireDeleteTarget(board, columnId, targetColumnId);
				await normalizeCards(
					tx,
					targetId,
					[...orderedCardIds(cards, targetId), ...movedIds],
					now,
				);
			}
			await tx.taskColumn.delete({ where: { id: columnId } });
			await normalizeColumns(
				tx,
				board.columns.map((item) => item.id).filter((id) => id !== columnId),
				now,
			);
		});
	}

	async createCard(
		organizationName: string,
		boardKey: string,
		input: CreateTaskCardInput,
	): Promise<TaskCard> {
		const now = new Date().toISOString();
		return this.db.transaction(async (tx) => {
			const board = await tx.taskBoard.findUnique({
				where: { organizationName_key: { organizationName, key: boardKey } },
				include: { columns: true },
			});
			if (!board) throw new NotFoundError(`Task board "${boardKey}" not found`);
			if (!board.columns.some((column) => column.id === input.columnId)) {
				throw new NotFoundError("Task column not found");
			}
			const nextNumber = board.lastTaskNumber + 1;
			const publicId = `${board.key}-${nextNumber}`;
			const position = await tx.taskCard.count({
				where: { columnId: input.columnId },
			});
			await tx.taskBoard.update({
				where: { id: board.id },
				data: { lastTaskNumber: nextNumber, updatedAt: now },
			});
			const card = await tx.taskCard.create({
				data: {
					boardId: board.id,
					columnId: input.columnId,
					publicId,
					number: nextNumber,
					title: input.title,
					description: input.description,
					position,
					createdAt: now,
					updatedAt: now,
				},
			});
			return cardToResponse(card);
		});
	}

	async updateCard(
		organizationName: string,
		boardKey: string,
		taskPublicId: string,
		input: UpdateTaskCardInput,
	): Promise<TaskCard> {
		const now = new Date().toISOString();
		return this.db.transaction(async (tx) => {
			const board = await tx.taskBoard.findUnique({
				where: { organizationName_key: { organizationName, key: boardKey } },
				include: {
					columns: true,
				},
			});
			if (!board) throw new NotFoundError(`Task board "${boardKey}" not found`);
			const cards = await tx.taskCard.findMany({
				where: { boardId: board.id },
				orderBy: { position: "asc" },
			});
			const card = requireCard(cards, taskPublicId);
			const nextColumnId = input.columnId ?? card.columnId;
			requireColumnId(board, nextColumnId);
			if (input.columnId !== undefined || input.position !== undefined) {
				if (card.columnId === nextColumnId) {
					await normalizeCards(
						tx,
						card.columnId,
						sameColumnOrder(cards, card, input.position),
						now,
					);
				} else {
					await normalizeCards(
						tx,
						card.columnId,
						orderedCardIds(cards, card.columnId).filter((id) => id !== card.id),
						now,
					);
					await normalizeCards(
						tx,
						nextColumnId,
						targetColumnOrder(cards, card, nextColumnId, input.position),
						now,
					);
				}
			}
			const updated = await tx.taskCard.update({
				where: { id: card.id },
				data: {
					...(input.title === undefined ? {} : { title: input.title }),
					...(input.description === undefined
						? {}
						: { description: input.description }),
					...(input.columnId === undefined ? {} : { columnId: nextColumnId }),
					updatedAt: now,
				},
			});
			return cardToResponse(updated);
		});
	}

	async deleteCard(
		organizationName: string,
		boardKey: string,
		taskPublicId: string,
	): Promise<void> {
		const now = new Date().toISOString();
		await this.db.transaction(async (tx) => {
			const board = await tx.taskBoard.findUnique({
				where: { organizationName_key: { organizationName, key: boardKey } },
			});
			if (!board) throw new NotFoundError(`Task board "${boardKey}" not found`);
			const cards = await tx.taskCard.findMany({
				where: { boardId: board.id },
				orderBy: { position: "asc" },
			});
			const card = requireCard(cards, taskPublicId);
			await tx.taskCard.delete({ where: { id: card.id } });
			await normalizeCards(
				tx,
				card.columnId,
				cards
					.filter(
						(item) => item.columnId === card.columnId && item.id !== card.id,
					)
					.map((item) => item.id),
				now,
			);
		});
	}
}
