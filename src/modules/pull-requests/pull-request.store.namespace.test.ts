import { afterEach, describe, expect, it } from "vitest";
import { cleanupAllTestDatabases, createTestDatabase } from "#/test-db";
import { PrismaPullRequestStore } from "./prisma-pull-request.store";

describe("PrismaPullRequestStore organization namespaces", () => {
	afterEach(() => {
		cleanupAllTestDatabases();
	});

	it("isolates pull requests for identically named repositories", async () => {
		const db = createTestDatabase();
		const c = db.getClient();
		const now = new Date().toISOString();
		await c.organization.create({ data: { name: "team-a", createdAt: now } });
		await c.organization.create({ data: { name: "team-b", createdAt: now } });
		await c.user.create({
			data: {
				id: "00000000-0000-4000-8000-000000000001",
				name: "a",
				email: "a@a",
				createdAt: now,
				credential: "{}",
			},
		});
		await c.user.create({
			data: {
				id: "00000000-0000-4000-8000-000000000002",
				name: "b",
				email: "b@b",
				createdAt: now,
				credential: "{}",
			},
		});
		await c.repository.create({
			data: {
				id: "team-a/shared",
				organizationName: "team-a",
				name: "shared",
				createdAt: now,
				ownerId: "00000000-0000-4000-8000-000000000001",
			},
		});
		await c.repository.create({
			data: {
				id: "team-b/shared",
				organizationName: "team-b",
				name: "shared",
				createdAt: now,
				ownerId: "00000000-0000-4000-8000-000000000002",
			},
		});
		const store = new PrismaPullRequestStore(db);
		const common = {
			repoName: "shared",
			title: "Change",
			sourceBranch: "feature",
			targetBranch: "main",
			authorName: "anonymous",
		};

		await store.create({ ...common, organizationName: "team-a" });
		await store.create({ ...common, organizationName: "team-b" });

		await expect(
			store.list({
				organizationName: "team-a",
				repositoryName: "shared",
			}),
		).resolves.toMatchObject([{ organizationName: "team-a", id: 1 }]);
		await expect(
			store.list({
				organizationName: "team-b",
				repositoryName: "shared",
			}),
		).resolves.toMatchObject([{ organizationName: "team-b", id: 1 }]);
	});
});
