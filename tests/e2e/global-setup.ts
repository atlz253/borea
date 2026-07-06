import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execaSync } from "execa";

const NOAUTH_USER_ID = "00000000-0000-4000-8000-000000000000";

async function globalSetup() {
	const url = process.env.E2E_DATABASE_URL;
	if (!url) {
		throw new Error("E2E_DATABASE_URL not set by Playwright config");
	}

	const absPath = url.replace("file:", "");
	const dir = dirname(absPath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	execaSync(
		"node",
		[
			"node_modules/prisma/build/index.js",
			"db",
			"push",
			"--accept-data-loss",
			"--url",
			url,
		],
		{ env: { ...process.env, DATABASE_URL: url } },
	);

	const { createClient } = await import("@libsql/client");
	const client = createClient({ url });

	const now = new Date().toISOString();

	client.execute({
		sql: `INSERT OR IGNORE INTO User (id, name, email, createdAt, credential) VALUES (?, ?, ?, ?, ?)`,
		args: [
			NOAUTH_USER_ID,
			"anonymous",
			"noauth@localhost",
			new Date(0).toISOString(),
			"",
		],
	});

	client.execute({
		sql: `INSERT OR IGNORE INTO Organization (name, description, createdAt) VALUES (?, ?, ?)`,
		args: ["default", "Default organization", now],
	});

	client.close();
}

export default globalSetup;
