import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execaSync } from "execa";
import { CliGitProvider } from "#/modules/git";
import { PrismaOrganizationStore } from "#/modules/organizations";
import type {
	DatabaseProvider,
	PrismaDatabaseProvider,
} from "#/platform/database";
import { createTestDatabase } from "#/test-db";

const COMMIT_ENV = {
	GIT_AUTHOR_NAME: "test",
	GIT_AUTHOR_EMAIL: "test@test.com",
	GIT_COMMITTER_NAME: "test",
	GIT_COMMITTER_EMAIL: "test@test.com",
};

export const NOAUTH_USER_ID = "00000000-0000-4000-8000-000000000000";

export interface IntegrationContext {
	db: PrismaDatabaseProvider;
	orgStore: PrismaOrganizationStore;
	gitProvider: CliGitProvider;
	storagePath: string;
	cleanup: () => void;
}

export function createIntegrationContext(
	storageDir?: string,
): IntegrationContext {
	const db = createTestDatabase();
	const store = new PrismaOrganizationStore(db);
	const storagePath =
		storageDir ?? mkdtempSync(join(tmpdir(), "nirvana-int-storage-"));
	const gitProvider = new CliGitProvider(storagePath);

	const cleanup = () => {
		try {
			rmSync(storagePath, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	};

	return { db, orgStore: store, gitProvider, storagePath, cleanup };
}

export async function seedNoAuthUser(db: DatabaseProvider): Promise<void> {
	const c = db.getClient();
	const count = await c.user.count({ where: { id: NOAUTH_USER_ID } });
	if (count === 0) {
		await c.user.create({
			data: {
				id: NOAUTH_USER_ID,
				name: "anonymous",
				email: "noauth@localhost",
				createdAt: new Date(0).toISOString(),
				credential: "",
			},
		});
	}
}

export function seedBareRepo(
	storagePath: string,
	organizationName: string,
	repoName: string,
	files: Record<string, string>,
	branch = "master",
): void {
	const barePath = join(storagePath, organizationName, repoName);
	execaSync("git", ["init", "--bare", barePath]);

	const workDir = mkdtempSync(join(tmpdir(), "nirvana-int-seed-"));
	try {
		execaSync("git", ["init", workDir]);
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = join(workDir, filePath);
			const normalizedPath = fullPath.replace(/\\/g, "/");
			const sepIdx = normalizedPath.lastIndexOf("/");
			if (sepIdx > 0) {
				const parentDir = fullPath.slice(0, sepIdx);
				try {
					mkdirSync(parentDir, { recursive: true });
				} catch {
					// directory already exists
				}
			}
			writeFileSync(fullPath, content, "utf-8");
		}
		execaSync("git", ["add", "--all"], { cwd: workDir });
		execaSync("git", ["commit", "--message=seed"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});
		execaSync("git", ["remote", "add", "origin", barePath], { cwd: workDir });
		execaSync("git", ["push", "origin", `HEAD:${branch}`], { cwd: workDir });
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}

export function seedBranch(
	storagePath: string,
	organizationName: string,
	repoName: string,
	branch: string,
	files: Record<string, string>,
): void {
	const barePath = join(storagePath, organizationName, repoName);
	const workDir = mkdtempSync(join(tmpdir(), "nirvana-int-branch-"));
	try {
		execaSync("git", ["clone", barePath, workDir]);
		execaSync("git", ["checkout", "-b", branch], { cwd: workDir });
		for (const [filePath, content] of Object.entries(files)) {
			writeFileSync(join(workDir, filePath), content, "utf-8");
		}
		execaSync("git", ["add", "--all"], { cwd: workDir });
		execaSync("git", ["commit", "--message=branch"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});
		execaSync("git", ["push", "origin", `HEAD:${branch}`], { cwd: workDir });
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}
