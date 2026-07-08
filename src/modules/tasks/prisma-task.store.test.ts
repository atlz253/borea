import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseProvider } from "#/platform/database";
import { ValidationError } from "#/platform/errors";
import { cleanupAllTestDatabases, createTestDatabase } from "#/test-db";
import { PrismaTaskStore } from "./prisma-task.store";

describe("PrismaTaskStore", () => {
	let db: DatabaseProvider;
	let store: PrismaTaskStore;

	beforeEach(async () => {
		db = createTestDatabase();
		const now = new Date().toISOString();
		await db.getClient().organization.create({
			data: { name: "default", createdAt: now },
		});
		await db.getClient().organization.create({
			data: { name: "other", createdAt: now },
		});
		store = new PrismaTaskStore(db);
	});

	afterEach(() => {
		cleanupAllTestDatabases();
	});

	it("creates a board with default columns", async () => {
		const board = await store.createBoard("default", {
			key: "TASK",
			name: "Team tasks",
			description: "",
		});

		expect(board.key).toBe("TASK");
		expect(board.columns.map((column) => column.name)).toEqual([
			"Backlog",
			"To do",
			"Doing",
			"Done",
		]);
	});

	it("allows the same board key in different organizations", async () => {
		await store.createBoard("default", {
			key: "TASK",
			name: "Default tasks",
			description: "",
		});
		await expect(
			store.createBoard("other", {
				key: "TASK",
				name: "Other tasks",
				description: "",
			}),
		).resolves.toMatchObject({ organizationName: "other", key: "TASK" });
	});

	it("creates monotonic public task IDs", async () => {
		const board = await store.createBoard("default", {
			key: "TASK",
			name: "Team tasks",
			description: "",
		});
		const first = await store.createCard("default", "TASK", {
			columnId: board.columns[0].id,
			title: "First",
			description: "",
		});
		await store.deleteCard("default", "TASK", first.publicId);
		const second = await store.createCard("default", "TASK", {
			columnId: board.columns[0].id,
			title: "Second",
			description: "",
		});

		expect(first.publicId).toBe("TASK-1");
		expect(second.publicId).toBe("TASK-2");
	});

	it("moves cards when deleting a non-empty column", async () => {
		const board = await store.createBoard("default", {
			key: "TASK",
			name: "Team tasks",
			description: "",
		});
		const source = board.columns[0];
		const target = board.columns[1];
		const card = await store.createCard("default", "TASK", {
			columnId: source.id,
			title: "Move me",
			description: "",
		});

		await store.deleteColumn("default", "TASK", source.id, target.id);

		const updated = await store.getBoard("default", "TASK");
		expect(updated?.columns.some((column) => column.id === source.id)).toBe(
			false,
		);
		expect(updated?.cards.find((item) => item.id === card.id)).toMatchObject({
			columnId: target.id,
			position: 0,
		});
	});

	it("prevents deleting the last column", async () => {
		const board = await store.createBoard("default", {
			key: "TASK",
			name: "Team tasks",
			description: "",
		});
		for (const column of board.columns.slice(1)) {
			await store.deleteColumn("default", "TASK", column.id);
		}

		await expect(
			store.deleteColumn("default", "TASK", board.columns[0].id),
		).rejects.toBeInstanceOf(ValidationError);
	});
});
