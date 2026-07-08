import { execaSync } from "execa";
import { ensureFileDatabaseDir } from "#/platform/paths";

const NOAUTH_USER_ID = "00000000-0000-4000-8000-000000000000";

async function globalSetup() {
	const url = process.env.E2E_DATABASE_URL;
	if (!url) {
		throw new Error("E2E_DATABASE_URL not set by Playwright config");
	}

	ensureFileDatabaseDir(url);

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
		{ env: { ...process.env, DATABASE_URL: url, RUST_LOG: "info" } },
	);

	const { createClient } = await import("@libsql/client");
	const client = createClient({ url });

	const now = new Date().toISOString();

	await client.execute({
		sql: `INSERT OR IGNORE INTO User (id, name, email, createdAt, credential) VALUES (?, ?, ?, ?, ?)`,
		args: [
			NOAUTH_USER_ID,
			"anonymous",
			"noauth@localhost",
			new Date(0).toISOString(),
			"",
		],
	});

	await client.execute({
		sql: `INSERT OR IGNORE INTO Organization (name, description, createdAt) VALUES (?, ?, ?)`,
		args: ["default", "Default organization", now],
	});

	client.close();
}

export default globalSetup;
