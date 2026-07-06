import "dotenv/config";
import { ensureFileDatabaseDir } from "./src/platform/paths";
import { defineConfig, env } from "prisma/config";

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
