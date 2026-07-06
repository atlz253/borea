import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { PrismaPullRequestStore } from "#/modules/pull-requests/prisma-pull-request.store";
import { PrismaDatabaseProvider } from "#/platform/database";

const ORGANIZATION_NAME = "default";
const REPOSITORIES_PATH = "./data/repositories/default";
const COMMIT_ENV = {
	GIT_AUTHOR_NAME: "e2e",
	GIT_AUTHOR_EMAIL: "e2e@test.com",
	GIT_COMMITTER_NAME: "e2e",
	GIT_COMMITTER_EMAIL: "e2e@test.com",
};

async function seedRepository(repoName: string, conflict: boolean) {
	const barePath = resolve(REPOSITORIES_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `nirvana-rest-${repoName}-`));
	await execa("git", ["init", "--bare", barePath]);
	const { stdout: branchOutput } = await execa("git", [
		"--git-dir",
		barePath,
		"symbolic-ref",
		"--short",
		"HEAD",
	]);
	const targetBranch = branchOutput.trim();

	await execa("git", ["init", workDir]);
	await writeFile(join(workDir, "file.txt"), "base\n", "utf-8");
	await execa("git", ["add", "--all"], { cwd: workDir });
	await execa("git", ["commit", "--message=base"], {
		cwd: workDir,
		env: COMMIT_ENV,
	});
	await execa("git", ["remote", "add", "origin", barePath], { cwd: workDir });
	await execa("git", ["push", "origin", `HEAD:${targetBranch}`], {
		cwd: workDir,
	});

	await execa("git", ["checkout", "-b", "feature"], { cwd: workDir });
	await writeFile(
		join(workDir, conflict ? "file.txt" : "feature.txt"),
		"feature\n",
		"utf-8",
	);
	await execa("git", ["add", "--all"], { cwd: workDir });
	await execa("git", ["commit", "--message=feature"], {
		cwd: workDir,
		env: COMMIT_ENV,
	});
	await execa("git", ["push", "origin", "HEAD:feature"], { cwd: workDir });

	if (conflict) {
		await execa("git", ["checkout", targetBranch], { cwd: workDir });
		await writeFile(join(workDir, "file.txt"), "target\n", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=target"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});
		await execa("git", ["push", "origin", `HEAD:${targetBranch}`], {
			cwd: workDir,
		});
	}

	const db = new PrismaDatabaseProvider();
	const store = new PrismaPullRequestStore(db);
	const pullRequest = await store.create({
		organizationName: ORGANIZATION_NAME,
		repoName,
		title: conflict ? "Conflicting change" : "Feature change",
		sourceBranch: "feature",
		targetBranch,
		authorName: "e2e",
	});

	return { barePath, workDir, pullRequest };
}

test("REST API lists, reads, merges, and deletes repository data", async ({
	request,
}) => {
	test.setTimeout(90000);
	const repoName = `rest-api-${Date.now().toString(36)}`;
	const seeded = await seedRepository(repoName, false);

	try {
		const organizationsResponse = await request.get("/api/v1/organizations");
		expect(organizationsResponse.ok()).toBe(true);
		await expect(organizationsResponse.json()).resolves.toMatchObject([
			{ name: ORGANIZATION_NAME },
		]);
		const createOrganizationResponse = await request.post(
			"/api/v1/organizations",
			{ data: { name: "not-allowed-in-single-mode" } },
		);
		expect(createOrganizationResponse.status()).toBe(409);

		const listResponse = await request.get(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories`,
		);
		expect(listResponse.ok()).toBe(true);
		expect(
			(await listResponse.json()) as Array<{ name: string }>,
		).toContainEqual(expect.objectContaining({ name: repoName }));

		const repositoryResponse = await request.get(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}`,
		);
		expect(repositoryResponse.ok()).toBe(true);
		await expect(repositoryResponse.json()).resolves.toMatchObject({
			name: repoName,
			createdAt: expect.any(String),
		});

		const pullRequestsResponse = await request.get(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}/pull-requests`,
		);
		expect(pullRequestsResponse.ok()).toBe(true);
		await expect(pullRequestsResponse.json()).resolves.toHaveLength(1);

		const pullRequestResponse = await request.get(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}/pull-requests/${seeded.pullRequest.id}`,
		);
		expect(pullRequestResponse.ok()).toBe(true);
		await expect(pullRequestResponse.json()).resolves.toMatchObject({
			id: seeded.pullRequest.id,
			status: "open",
		});

		const mergeResponse = await request.post(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}/pull-requests/${seeded.pullRequest.id}/merge`,
			{ data: { fastForward: true } },
		);
		expect(mergeResponse.ok()).toBe(true);
		await expect(mergeResponse.json()).resolves.toMatchObject({
			pullRequest: { status: "merged" },
			mergeResult: { fastForward: true },
		});

		const repeatedMerge = await request.post(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}/pull-requests/${seeded.pullRequest.id}/merge`,
		);
		expect(repeatedMerge.status()).toBe(409);
		await expect(repeatedMerge.json()).resolves.toMatchObject({
			code: "conflict",
		});

		const deleteResponse = await request.delete(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}`,
		);
		expect(deleteResponse.status()).toBe(204);
		expect(existsSync(seeded.barePath)).toBe(false);

		const missingResponse = await request.get(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}`,
		);
		expect(missingResponse.status()).toBe(404);
	} finally {
		rmSync(seeded.workDir, { recursive: true, force: true });
		rmSync(seeded.barePath, { recursive: true, force: true });
	}
});

test("REST API validates parameters and reports merge conflicts", async ({
	request,
}) => {
	test.setTimeout(90000);
	const repoName = `rest-conflict-${Date.now().toString(36)}`;
	const seeded = await seedRepository(repoName, true);

	try {
		const invalidResponse = await request.get(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/.invalid`,
		);
		expect(invalidResponse.status()).toBe(400);

		const missingResponse = await request.get(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/missing-rest-repository`,
		);
		expect(missingResponse.status()).toBe(404);

		const conflictResponse = await request.post(
			`/api/v1/organizations/${ORGANIZATION_NAME}/repositories/${repoName}/pull-requests/${seeded.pullRequest.id}/merge`,
		);
		expect(conflictResponse.status()).toBe(409);
		await expect(conflictResponse.json()).resolves.toMatchObject({
			code: "conflict",
			details: { conflictingFiles: expect.any(Array) },
		});

		const openApiResponse = await request.get("/api/v1/openapi.json");
		expect(openApiResponse.ok()).toBe(true);
		await expect(openApiResponse.json()).resolves.toMatchObject({
			openapi: "3.1.0",
		});
		expect((await request.get("/api/v1/repositories")).status()).toBe(404);
		expect(
			(
				await request.get(
					"/api/git/legacy.git/info/refs?service=git-upload-pack",
				)
			).status(),
		).toBe(404);
	} finally {
		rmSync(seeded.workDir, { recursive: true, force: true });
		rmSync(seeded.barePath, { recursive: true, force: true });
	}
});
