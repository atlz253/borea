import { arrayMove } from "@dnd-kit/sortable";
import type { TaskBoardDetail, TaskCard, TaskColumn } from "./schemas";

export type TaskBoardDragData =
	| { type: "column"; columnId: string }
	| { type: "card"; cardId: string };

export function sortedTaskColumns(board: TaskBoardDetail): TaskColumn[] {
	return [...board.columns].sort((a, b) => a.position - b.position);
}

export function sortedTaskCards(
	board: TaskBoardDetail,
	columnId: string,
): TaskCard[] {
	return board.cards
		.filter((card) => card.columnId === columnId)
		.sort((a, b) => a.position - b.position);
}

function clampPosition(position: number, length: number): number {
	return Math.min(Math.max(position, 0), length);
}

export function taskBoardCardMoveTarget(
	board: TaskBoardDetail,
	overData: TaskBoardDragData,
): { columnId: string; position: number } | undefined {
	const overCard =
		overData.type === "card"
			? board.cards.find((card) => card.id === overData.cardId)
			: undefined;
	const columnId =
		overData.type === "column" ? overData.columnId : overCard?.columnId;
	if (!columnId) {
		return undefined;
	}
	const targetCards = sortedTaskCards(board, columnId);
	return {
		columnId,
		position:
			overData.type === "column"
				? targetCards.length
				: Math.max(
						0,
						targetCards.findIndex((card) => card.id === overData.cardId),
					),
	};
}

export function moveTaskBoardColumn(
	board: TaskBoardDetail,
	activeColumnId: string,
	overColumnId: string,
): TaskBoardDetail | undefined {
	const columns = sortedTaskColumns(board);
	const activeIndex = columns.findIndex(
		(column) => column.id === activeColumnId,
	);
	const overIndex = columns.findIndex((column) => column.id === overColumnId);
	if (activeIndex < 0 || overIndex < 0) {
		return undefined;
	}
	const ordered = arrayMove(columns, activeIndex, overIndex);
	const positions = new Map(
		ordered.map((column, position) => [column.id, position]),
	);
	return {
		...board,
		columns: board.columns.map((column) => ({
			...column,
			position: positions.get(column.id) ?? column.position,
		})),
	};
}

export function moveTaskBoardCard(
	board: TaskBoardDetail,
	activeCardId: string,
	targetColumnId: string,
	targetPosition: number,
): TaskBoardDetail | undefined {
	const activeCard = board.cards.find((card) => card.id === activeCardId);
	if (!activeCard) {
		return undefined;
	}
	const nextCards = board.cards.filter((card) => card.id !== activeCardId);
	const targetCards = nextCards
		.filter((card) => card.columnId === targetColumnId)
		.sort((a, b) => a.position - b.position);
	const orderedTargetIds = targetCards.map((card) => card.id);
	orderedTargetIds.splice(
		clampPosition(targetPosition, orderedTargetIds.length),
		0,
		activeCardId,
	);
	const positions = new Map<string, { columnId: string; position: number }>();
	for (const [position, cardId] of orderedTargetIds.entries()) {
		positions.set(cardId, { columnId: targetColumnId, position });
	}
	if (activeCard.columnId !== targetColumnId) {
		const sourceIds = nextCards
			.filter((card) => card.columnId === activeCard.columnId)
			.sort((a, b) => a.position - b.position)
			.map((card) => card.id);
		for (const [position, cardId] of sourceIds.entries()) {
			positions.set(cardId, { columnId: activeCard.columnId, position });
		}
	}
	return {
		...board,
		cards: board.cards.map((card) => {
			const next = positions.get(card.id);
			return next ? { ...card, ...next } : card;
		}),
	};
}
