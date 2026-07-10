import { createServerFn } from "@tanstack/react-start";
import { assertSameOriginFn, requireCurrentUserFn } from "#/modules/auth";
import { gitProvider } from "#/modules/git";
import {
	PrismaOrganizationStore,
	requireRepositoryPermissionFn,
} from "#/modules/organizations";
import { PrismaDatabaseProvider } from "#/platform/database";
import { ConflictError } from "#/platform/errors";
import { PrismaPullRequestStore } from "../prisma-pull-request.store";
import { createPullRequestService } from "../pull-request.service";

const prismaDb = new PrismaDatabaseProvider();
const pullRequestStore = new PrismaPullRequestStore(prismaDb);
const orgStore = new PrismaOrganizationStore(prismaDb);

import {
	addPullRequestFileCommentSchema,
	createPullRequestSchema,
	getPullRequestSchema,
	listPullRequestsSchema,
	mergePullRequestSchema,
	setPullRequestFileViewedSchema,
} from "../schemas";

const service = createPullRequestService(gitProvider, pullRequestStore);
const locator = (data: { organizationName: string; repoName: string }) => ({
	organizationName: data.organizationName,
	repositoryName: data.repoName,
});
const requireRepository = (
	organizationName: string,
	repositoryName: string,
	permission: "read" | "write" | "delete",
) =>
	requireRepositoryPermissionFn({
		data: { organizationName, repositoryName, permission },
	});

export const createPullRequestFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.repoName, "write");
		const user = await requireCurrentUserFn();
		try {
			await orgStore.createRepositoryAccess(
				data.organizationName,
				data.repoName,
				user.id,
			);
		} catch (error) {
			if (
				error instanceof ConflictError &&
				error.message === "Repository already exists"
			) {
				return service.createPullRequest({
					...data,
					authorName: user.username,
				});
			}
			if (
				typeof error !== "object" ||
				error === null ||
				(error as { code?: string }).code !== "P2002"
			) {
				throw error;
			}
		}
		return service.createPullRequest({ ...data, authorName: user.username });
	});

export const listPullRequestsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listPullRequestsSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.repoName, "read");
		return service.listPullRequests(locator(data));
	});

export const deletePullRequestsForRepositoryFn = createServerFn({
	method: "POST",
})
	.validator((data: unknown) => listPullRequestsSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.repoName, "delete");
		await pullRequestStore.deleteAll(locator(data));
	});

export const getPullRequestFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.repoName, "read");
		return service.getPullRequest(locator(data), data.id);
	});

export const mergePullRequestFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => mergePullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.repoName, "write");
		return service.mergePullRequest(locator(data), data.id, {
			fastForward: data.fastForward,
		});
	});

export const checkMergeStatusFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.repoName, "read");
		return service.checkMergeStatus(locator(data), data.id);
	});

export const getPullRequestDiffFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.repoName, "read");
		return service.getPullRequestDiff(locator(data), data.id);
	});

export const listPullRequestCommentsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await requireRepository(data.organizationName, data.repoName, "read");
		return service.listPullRequestComments(locator(data), data.id);
	});

export const addPullRequestFileCommentFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => addPullRequestFileCommentSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.repoName, "read");
		const user = await requireCurrentUserFn();
		return service.addPullRequestFileComment(
			locator(data),
			data.id,
			data.filePath,
			data.body,
			user,
		);
	});

export const setPullRequestFileViewedFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => setPullRequestFileViewedSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireRepository(data.organizationName, data.repoName, "write");
		return service.setPullRequestFileViewed(
			locator(data),
			data.id,
			data.filePath,
			data.viewed,
		);
	});
