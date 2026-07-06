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

describe("repository lifecycle integration", () => {
	afterEach(() => {
		cleanupAllTestDatabases();
	});

	it("creates a repo, registers it, creates PR, and merges it", async () => {
		const ctx = createIntegrationContext();
		await seedNoAuthUser(ctx.db);
		const repoName = "test-repo";
		const orgName = "default";

		seedBareRepo(ctx.storagePath, orgName, repoName, {
			"README.md": "# Test Repo\n",
			"src/main.ts": "console.log('hello');\n",
		});

		seedBranch(ctx.storagePath, orgName, repoName, "feature", {
			"src/feature.ts": "export function feature() { return 42; }\n",
		});

		const orgService = createOrganizationService(ctx.orgStore, "single", true);

		await orgService.createRepositoryAccess(
			orgName,
			repoName,
			"00000000-0000-4000-8000-000000000000",
		);

		const branches = await ctx.gitProvider.listBranches({
			organizationName: orgName,
			repositoryName: repoName,
		});
		expect(branches).toHaveLength(2);
		expect(branches.find((b) => b.name === "master")).toBeDefined();
		expect(branches.find((b) => b.name === "feature")).toBeDefined();

		const prService = createPullRequestService(
			ctx.gitProvider,
			new PrismaPullRequestStore(ctx.db),
		);

		const pr = await prService.createPullRequest({
			organizationName: orgName,
			repoName,
			title: "Add feature",
			sourceBranch: "feature",
			targetBranch: "master",
			authorName: "test-user",
		});
		expect(pr.title).toBe("Add feature");
		expect(pr.status).toBe("open");
		expect(pr.id).toBe(1);

		const mergeStatus = await prService.checkMergeStatus(
			{ organizationName: orgName, repositoryName: repoName },
			pr.id,
		);
		expect(mergeStatus.conflicts).toBe(false);

		const mergeResult = await prService.mergePullRequest(
			{ organizationName: orgName, repositoryName: repoName },
			pr.id,
			{ fastForward: true },
		);
		expect(mergeResult.pullRequest.status).toBe("merged");
		expect(mergeResult.mergeResult.fastForward).toBe(true);

		const mergedPr = await prService.getPullRequest(
			{ organizationName: orgName, repositoryName: repoName },
			pr.id,
		);
		expect(mergedPr?.status).toBe("merged");

		const headCommits = await ctx.gitProvider.listCommits(
			{ organizationName: orgName, repositoryName: repoName },
			{ limit: 10 },
		);
		expect(headCommits.length).toBeGreaterThanOrEqual(2);

		const file = await ctx.gitProvider.getFile(
			{ organizationName: orgName, repositoryName: repoName },
			{ path: "src/feature.ts", maxBytes: 1024 },
		);
		expect("content" in file).toBe(true);
		if ("content" in file && typeof file.content === "string") {
			expect(file.content).toContain("feature");
		}

		ctx.cleanup();
	});

	it("detects merge conflicts and prevents merge", async () => {
		const ctx = createIntegrationContext();
		await seedNoAuthUser(ctx.db);
		const repoName = "conflict-repo";
		const orgName = "default";

		seedBareRepo(ctx.storagePath, orgName, repoName, {
			"file.txt": "base content\n",
		});

		seedBranch(ctx.storagePath, orgName, repoName, "feature-a", {
			"file.txt": "feature a change\n",
		});

		seedBranch(ctx.storagePath, orgName, repoName, "feature-b", {
			"file.txt": "feature b change\n",
		});

		const orgService = createOrganizationService(ctx.orgStore, "single", true);
		await orgService.createRepositoryAccess(
			orgName,
			repoName,
			"00000000-0000-4000-8000-000000000000",
		);

		const prService = createPullRequestService(
			ctx.gitProvider,
			new PrismaPullRequestStore(ctx.db),
		);

		const pr = await prService.createPullRequest({
			organizationName: orgName,
			repoName,
			title: "Feature A",
			sourceBranch: "feature-a",
			targetBranch: "feature-b",
			authorName: "test-user",
		});

		const mergeStatus = await prService.checkMergeStatus(
			{ organizationName: orgName, repositoryName: repoName },
			pr.id,
		);
		expect(mergeStatus.conflicts).toBe(true);
		expect(mergeStatus.conflictingFiles?.length).toBeGreaterThan(0);

		await expect(
			prService.mergePullRequest(
				{ organizationName: orgName, repositoryName: repoName },
				pr.id,
				{ fastForward: false },
			),
		).rejects.toThrow();

		ctx.cleanup();
	});
});
