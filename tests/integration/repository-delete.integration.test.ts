import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createOrganizationService } from "#/modules/organizations";
import { PrismaPullRequestStore } from "#/modules/pull-requests/prisma-pull-request.store";
import { createPullRequestService } from "#/modules/pull-requests/pull-request.service";
import { cleanupAllTestDatabases } from "#/test-db";
import {
	createIntegrationContext,
	seedBareRepo,
	seedBranch,
	seedNoAuthUser,
} from "./helpers";

describe("repository delete integration", () => {
	afterEach(() => {
		cleanupAllTestDatabases();
	});

	it("deletes repository and cascades to pull requests", async () => {
		const ctx = createIntegrationContext();
		await seedNoAuthUser(ctx.db);
		const repoName = "delete-test-repo";
		const orgName = "default";

		seedBareRepo(ctx.storagePath, orgName, repoName, {
			"README.md": "# Delete Test\n",
		});
		seedBranch(ctx.storagePath, orgName, repoName, "feature", {
			"feature.txt": "feature content\n",
		});

		const orgService = createOrganizationService(ctx.orgStore, "single", true);

		await orgService.createRepositoryAccess(
			orgName,
			repoName,
			"00000000-0000-4000-8000-000000000000",
		);

		const pullRequestStore = new PrismaPullRequestStore(ctx.db);
		const prService = createPullRequestService(
			ctx.gitProvider,
			pullRequestStore,
		);

		await prService.createPullRequest({
			organizationName: orgName,
			repoName,
			title: "PR to delete",
			sourceBranch: "feature",
			targetBranch: "master",
			authorName: "test-user",
		});

		await prService.createPullRequest({
			organizationName: orgName,
			repoName,
			title: "Another PR to delete",
			sourceBranch: "feature",
			targetBranch: "master",
			authorName: "test-user",
		});

		let prs = await pullRequestStore.list({
			organizationName: orgName,
			repositoryName: repoName,
		});
		expect(prs).toHaveLength(2);

		await pullRequestStore.deleteAll({
			organizationName: orgName,
			repositoryName: repoName,
		});

		prs = await pullRequestStore.list({
			organizationName: orgName,
			repositoryName: repoName,
		});
		expect(prs).toHaveLength(0);

		const barePath = join(ctx.storagePath, orgName, repoName);
		expect(existsSync(barePath)).toBe(true);

		await ctx.gitProvider.delete({
			organizationName: orgName,
			repositoryName: repoName,
		});
		expect(existsSync(barePath)).toBe(false);

		await orgService.deleteRepositoryAccess(orgName, repoName);
		const repoAccess = await ctx.orgStore.getRepositoryAccess(
			orgName,
			repoName,
		);
		expect(repoAccess).toBeUndefined();

		ctx.cleanup();
	});
});
