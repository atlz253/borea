import { describe, expect, it } from "vitest";
import type { TaskBoardDetail, TaskCard, TaskColumn } from "./schemas";
import {
	moveTaskBoardCard,
	moveTaskBoardColumn,
	sortedTaskCards,
	sortedTaskColumns,
} from "./task-board-dnd";

const now = "2026-01-01T00:00:00.000Z";

function column(id: string, position: number): TaskColumn {
	return {
		id,
		boardId: "board-1",
		name: id,
		position,
		createdAt: now,
		updatedAt: now,
	};
}

function card(id: string, columnId: string, position: number): TaskCard {
	return {
		id,
		boardId: "board-1",
		columnId,
		publicId: `TASK-${position + 1}`,
		number: position + 1,
		title: id,
		description: "",
		position,
		createdAt: now,
		updatedAt: now,
	};
}

function board(): TaskBoardDetail {
	return {
		id: "board-1",
		organizationName: "default",
		key: "TASK",
		name: "Tasks",
		description: "",
		lastTaskNumber: 4,
		createdAt: now,
		updatedAt: now,
		columns: [column("todo", 0), column("doing", 1), column("done", 2)],
		cards: [
			card("todo-1", "todo", 0),
			card("todo-2", "todo", 1),
			card("doing-1", "doing", 0),
			card("doing-2", "doing", 1),
		],
	};
}

describe("task board drag helpers", () => {
	it("moves a card to the target column before server refresh", () => {
		const moved = moveTaskBoardCard(board(), "todo-1", "doing", 1);

		expect(moved).toBeDefined();
		expect(
			sortedTaskCards(moved as TaskBoardDetail, "todo").map((item) => [
				item.id,
				item.position,
			]),
		).toEqual([["todo-2", 0]]);
		expect(
			sortedTaskCards(moved as TaskBoardDetail, "doing").map((item) => [
				item.id,
				item.columnId,
				item.position,
			]),
		).toEqual([
			["doing-1", "doing", 0],
			["todo-1", "doing", 1],
			["doing-2", "doing", 2],
		]);
	});

	it("reorders columns optimistically", () => {
		const moved = moveTaskBoardColumn(board(), "done", "todo");

		expect(moved).toBeDefined();
		expect(
			sortedTaskColumns(moved as TaskBoardDetail).map((item) => [
				item.id,
				item.position,
			]),
		).toEqual([
			["done", 0],
			["todo", 1],
			["doing", 2],
		]);
	});
});
