import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function ensureFileDatabaseDir(databaseUrl: string): void {
	if (!databaseUrl.startsWith("file:")) return;
	const filePath = databaseUrl.slice("file:".length);
	const dir = dirname(resolve(filePath));
	mkdirSync(dir, { recursive: true });
}

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
	ensureFileDatabaseDir(databaseUrl);
}

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
