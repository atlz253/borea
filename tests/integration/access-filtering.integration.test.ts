import { afterEach, describe, expect, it } from "vitest";
import { createOrganizationService } from "#/modules/organizations";
import { cleanupAllTestDatabases } from "#/test-db";
import {
	createIntegrationContext,
	seedBareRepo,
	seedNoAuthUser,
} from "./helpers";

describe("repository access filtering integration", () => {
	afterEach(() => {
		cleanupAllTestDatabases();
	});

	it("allows all repos when bypassAccess is true", async () => {
		const ctx = createIntegrationContext();
		await seedNoAuthUser(ctx.db);
		const orgName = "bypass-org";

		seedBareRepo(ctx.storagePath, orgName, "repo-a", {
			"file.txt": "a\n",
		});
		seedBareRepo(ctx.storagePath, orgName, "repo-b", {
			"file.txt": "b\n",
		});

		const orgService = createOrganizationService(ctx.orgStore, "multi", true);

		await ctx.orgStore.create({
			name: orgName,
			initialMemberId: "00000000-0000-4000-8000-000000000000",
		});

		await orgService.createRepositoryAccess(
			orgName,
			"repo-a",
			"00000000-0000-4000-8000-000000000000",
		);

		const repos = await ctx.gitProvider.list(orgName);
		expect(repos).toHaveLength(2);
		expect(repos.find((r) => r.name === "repo-a")).toBeDefined();
		expect(repos.find((r) => r.name === "repo-b")).toBeDefined();

		ctx.cleanup();
	});
});
