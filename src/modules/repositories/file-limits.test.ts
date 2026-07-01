import { describe, expect, it } from "vitest";
import {
	FILE_OPEN_MAX_BYTES,
	FILE_PREVIEW_MAX_BYTES,
	resolveFileReadLimit,
} from "./file-limits";

describe("resolveFileReadLimit", () => {
	it("uses 1 MiB for the initial preview", () => {
		expect(resolveFileReadLimit(false)).toBe(1024 * 1024);
		expect(resolveFileReadLimit(false)).toBe(FILE_PREVIEW_MAX_BYTES);
	});

	it("uses 25 MiB for explicit large-file opening", () => {
		expect(resolveFileReadLimit(true)).toBe(25 * 1024 * 1024);
		expect(resolveFileReadLimit(true)).toBe(FILE_OPEN_MAX_BYTES);
	});
});
