import { createServerFn } from "@tanstack/react-start";
import { gitProvider } from "#/modules/git";
import { createPullRequestService } from "../pull-request.service";
import { pullRequestStore } from "../pull-request.store";
import {
	createPullRequestSchema,
	getPullRequestSchema,
	listPullRequestsSchema,
	mergePullRequestSchema,
} from "../schemas";

const service = createPullRequestService(gitProvider, pullRequestStore);

export const createPullRequestFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => createPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		return service.createPullRequest(data);
	});

export const listPullRequestsFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => listPullRequestsSchema.parse(data))
	.handler(async ({ data }) => {
		return service.listPullRequests(data.repoName);
	});

export const getPullRequestFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		return service.getPullRequest(data.repoName, data.id);
	});

export const mergePullRequestFn = createServerFn({ method: "POST" })
	.validator((data: unknown) => mergePullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		return service.mergePullRequest(data.repoName, data.id, {
			fastForward: data.fastForward,
		});
	});

export const checkMergeStatusFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		return service.checkMergeStatus(data.repoName, data.id);
	});

export const getPullRequestDiffFn = createServerFn({ method: "GET" })
	.validator((data: unknown) => getPullRequestSchema.parse(data))
	.handler(async ({ data }) => {
		return service.getPullRequestDiff(data.repoName, data.id);
	});
