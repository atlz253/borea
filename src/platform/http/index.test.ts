import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "#/platform/errors";
import { handleApiRequest, parseJsonBody } from ".";

describe("handleApiRequest", () => {
	it.each([
		[new ValidationError("invalid"), 400, "validation_error"],
		[new ForbiddenError("denied"), 403, "forbidden"],
		[new NotFoundError("missing"), 404, "not_found"],
		[new ConflictError("conflict"), 409, "conflict"],
	])("maps typed errors to JSON responses", async (error, status, code) => {
		const response = await handleApiRequest(() => Promise.reject(error));

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toMatchObject({ code });
	});

	it("does not expose unexpected error details", async () => {
		const response = await handleApiRequest(() =>
			Promise.reject(new Error("secret filesystem path")),
		);

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({
			code: "internal_error",
			message: "An unexpected error occurred",
		});
	});
});

describe("parseJsonBody", () => {
	const schema = z.object({ fastForward: z.boolean().optional() });

	it("uses an empty object for an omitted optional body", async () => {
		const request = new Request("http://localhost/merge", { method: "POST" });

		await expect(parseJsonBody(request, schema)).resolves.toEqual({});
	});

	it("rejects malformed JSON", async () => {
		const request = new Request("http://localhost/merge", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{",
		});

		await expect(parseJsonBody(request, schema)).rejects.toMatchObject({
			name: "ValidationError",
		});
	});
});
