import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execaSync } from "execa";
import { afterAll, expect, it } from "vitest";

const dirs: string[] = [];

afterAll(() => {
	for (const dir of dirs) {
		try {
			rmSync(dir, { recursive: true, force: true });
		} catch {
			// already cleaned
		}
	}
});

it("applies pending migrations to an empty database", async () => {
	const dir = mkdtempSync(
		join(tmpdir(), `borea-migrate-${randomUUID().slice(0, 8)}-`),
	);
	dirs.push(dir);
	const dbPath = join(dir, "borea.db");
	const url = `file:${dbPath}`;

	execaSync(
		"node",
		["node_modules/prisma/build/index.js", "migrate", "deploy"],
		{
			env: { ...process.env, DATABASE_URL: url },
		},
	);

	expect(existsSync(dbPath)).toBe(true);

	const { createClient } =
		require("@libsql/client") as typeof import("@libsql/client");
	const client = createClient({ url });
	try {
		const result = await client.execute(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='User'",
		);
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].name).toBe("User");
	} finally {
		client.close();
	}
});
