import { describe, expect, it } from "vitest";
import { registerSchema, usernameSchema, userSchema } from "./schemas";

describe("usernameSchema", () => {
	it("accepts ASCII letters, digits, dots, underscores, and hyphens", () => {
		expect(usernameSchema.parse("User_1.test-name")).toBe("User_1.test-name");
	});

	it("trims whitespace before validation", () => {
		expect(usernameSchema.parse("  alice  ")).toBe("alice");
	});

	it.each([
		"has space",
		"repo/name",
		"alice@example",
		"юзер",
		"a\0b",
	])("rejects invalid username %s", (value) => {
		expect(() => usernameSchema.parse(value)).toThrow();
	});

	it.each([
		".",
		"..",
		".hidden",
		"",
	])("rejects reserved username %s", (value) => {
		expect(() => usernameSchema.parse(value)).toThrow();
	});
});

describe("auth schemas", () => {
	it("registers with username, email, and password only", () => {
		const result = registerSchema.parse({
			username: "alice",
			email: "alice@example.com",
			password: "password123",
			name: "Alice",
		});

		expect(result).toEqual({
			username: "alice",
			email: "alice@example.com",
			password: "password123",
		});
	});

	it("serializes users without a name field", () => {
		const result = userSchema.parse({
			id: "550e8400-e29b-41d4-a716-446655440000",
			username: "alice",
			email: "alice@example.com",
			name: "Alice",
			createdAt: "2026-07-10T00:00:00.000Z",
		});

		expect(result).toEqual({
			id: "550e8400-e29b-41d4-a716-446655440000",
			username: "alice",
			email: "alice@example.com",
			createdAt: "2026-07-10T00:00:00.000Z",
		});
	});
});
