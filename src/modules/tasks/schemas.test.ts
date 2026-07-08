import { describe, expect, it } from "vitest";
import {
	createTaskBoardSchema,
	createTaskCardSchema,
	taskBoardKeySchema,
	updateTaskCardSchema,
} from "./schemas";

describe("task schemas", () => {
	it("normalizes board keys", () => {
		expect(taskBoardKeySchema.parse(" task-1 ")).toBe("TASK-1");
	});

	it("rejects invalid board keys", () => {
		expect(() => taskBoardKeySchema.parse("-TASK")).toThrow();
		expect(() => taskBoardKeySchema.parse("TASK_1")).toThrow();
		expect(() => taskBoardKeySchema.parse("TASK-")).toThrow();
	});

	it("trims board and card fields", () => {
		expect(
			createTaskBoardSchema.parse({
				key: "team",
				name: " Team board ",
				description: " Work ",
			}),
		).toMatchObject({
			key: "TEAM",
			name: "Team board",
			description: "Work",
		});
		expect(
			createTaskCardSchema.parse({
				columnId: "00000000-0000-4000-8000-000000000001",
				title: " First task ",
				description: " Details ",
			}),
		).toMatchObject({ title: "First task", description: "Details" });
	});

	it("requires at least one card update field", () => {
		expect(() => updateTaskCardSchema.parse({})).toThrow();
		expect(updateTaskCardSchema.parse({ position: 0 })).toEqual({
			position: 0,
		});
	});
});
