import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureFileDatabaseDir } from "./paths";

let tmpDir: string;

beforeEach(() => {
	tmpDir = join(
		__dirname,
		"..",
		"..",
		"..",
		"__test_tmp__",
		`paths-${Date.now()}`,
	);
});

afterEach(() => {
	try {
		rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// already cleaned
	}
});

describe("ensureFileDatabaseDir", () => {
	it("creates parent directory for file: URLs", () => {
		const url = `file:${join(tmpDir, "sub", "test.db")}`;
		ensureFileDatabaseDir(url);
		expect(existsSync(join(tmpDir, "sub"))).toBe(true);
	});

	it("does nothing for :memory: URLs", () => {
		expect(() => ensureFileDatabaseDir(":memory:")).not.toThrow();
	});

	it("does nothing for libsql:// remote URLs", () => {
		expect(() =>
			ensureFileDatabaseDir("libsql://my-db.turso.io"),
		).not.toThrow();
	});

	it("is idempotent when directory already exists", () => {
		const nested = join(tmpDir, "nested");
		mkdirSync(nested, { recursive: true });
		const url = `file:${join(nested, "db.sqlite")}`;
		ensureFileDatabaseDir(url);
		expect(existsSync(nested)).toBe(true);
	});
});
