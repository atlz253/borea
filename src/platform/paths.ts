import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function ensureFileDatabaseDir(databaseUrl: string): void {
	if (!databaseUrl.startsWith("file:")) return;
	const filePath = databaseUrl.slice("file:".length);
	const dir = dirname(resolve(filePath));
	mkdirSync(dir, { recursive: true });
}
