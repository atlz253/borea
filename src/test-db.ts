import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execaSync } from "execa";
import { PrismaDatabaseProvider } from "#/platform/database";

const RANDOM_SUFFIX_LENGTH = 8;
const directories: string[] = [];

export function createTestDatabase(): PrismaDatabaseProvider {
	const dir = mkdtempSync(
		join(
			tmpdir(),
			`nirvana-test-${randomUUID().slice(0, RANDOM_SUFFIX_LENGTH)}-`,
		),
	);
	directories.push(dir);
	const dbPath = join(dir, "test.db");
	const url = `file:${dbPath}`;
	execaSync("node", ["node_modules/prisma/build/index.js", "db", "push", "--accept-data-loss", "--url", url], {
		env: { ...process.env, DATABASE_URL: url },
	});
	return new PrismaDatabaseProvider(url);
}

export function cleanupAllTestDatabases(): void {
	for (const dir of directories) {
		try {
			rmSync(dir, { recursive: true, force: true });
		} catch {}
	}
	directories.length = 0;
}
