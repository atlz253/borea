import { createServerFn } from "@tanstack/react-start";
import { assertSameOriginFn, requireCurrentUserFn } from "#/modules/auth";
import { gitProvider } from "#/modules/git";
import { requireOrganizationFn } from "#/modules/organizations";
import { createPullRequestService } from "../pull-request.service";
import { pullRequestStore } from "../pull-request.store";
import {
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
const requireOrganization = (organizationName: string) =>
	requireOrganizationFn({ data: { organizationName } });

export const createPullRequestFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		const user = await requireCurrentUserFn();
		return service.createPullRequest({ ...data, authorName: user.name });
	});

export const listPullRequestsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listPullRequestsSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return service.listPullRequests(locator(data));
	});

export const deletePullRequestsForRepositoryFn = createServerFn({
	method: "POST",
})
	.validator((data: unknown) => listPullRequestsSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		await pullRequestStore.deleteAll(locator(data));
	});

export const getPullRequestFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return service.getPullRequest(locator(data), data.id);
	});

export const mergePullRequestFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => mergePullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		return service.mergePullRequest(locator(data), data.id, {
			fastForward: data.fastForward,
		});
	});

export const checkMergeStatusFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return service.checkMergeStatus(locator(data), data.id);
	});

export const getPullRequestDiffFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		await requireOrganization(data.organizationName);
		return service.getPullRequestDiff(locator(data), data.id);
	});

export const setPullRequestFileViewedFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => setPullRequestFileViewedSchema.parse(data))
	.handler(async ({ data }) => {
		await assertSameOriginFn();
		await requireOrganization(data.organizationName);
		return service.setPullRequestFileViewed(
			locator(data),
			data.id,
			data.filePath,
			data.viewed,
		);
	});
