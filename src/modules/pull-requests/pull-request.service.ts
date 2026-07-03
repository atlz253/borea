import type {
	DiffFile,
	GitProvider,
	MergeOptions,
	MergeResult,
	MergeStatus,
	RepositoryLocator,
} from "#/modules/git";
import { ConflictError, NotFoundError } from "#/platform/errors";
import type { PullRequestStore } from "./pull-request.store";
import type { PullRequest, PullRequestComment } from "./schemas";

type RepositoryTarget = RepositoryLocator | string;

export function createPullRequestService(
	gitProvider: GitProvider,
	store: PullRequestStore,
) {
	async function ensureRepositoryExists(
		locator: RepositoryTarget,
	): Promise<void> {
		if (!(await gitProvider.exists(locator as RepositoryLocator))) {
			throw new NotFoundError(
				`Repository "${typeof locator === "string" ? locator : locator.repositoryName}" not found`,
			);
		}
	}

	async function requirePullRequest(
		locator: RepositoryTarget,
		id: number,
	): Promise<PullRequest> {
		await ensureRepositoryExists(locator);
		const pullRequest = await store.get(locator as RepositoryLocator, id);
		if (!pullRequest) {
			throw new NotFoundError(`Pull request #${id} not found`);
		}
		return pullRequest;
	}

	return {
		async createPullRequest(input: {
			organizationName?: string;
			repoName: string;
			title: string;
			sourceBranch: string;
			targetBranch: string;
			authorName?: string;
		}): Promise<PullRequest> {
			const {
				organizationName,
				repoName,
				title,
				sourceBranch,
				targetBranch,
				authorName,
			} = input;
			const locator: RepositoryTarget = organizationName
				? { organizationName, repositoryName: repoName }
				: repoName;
			await ensureRepositoryExists(locator);

			if (sourceBranch === targetBranch) {
				throw new Error("Source and target branches must be different");
			}

			const branches = await gitProvider.listBranches(
				locator as RepositoryLocator,
			);
			const sourceExists = branches.some((b) => b.name === sourceBranch);
			if (!sourceExists) {
				throw new Error(`Source branch "${sourceBranch}" not found`);
			}
			const targetExists = branches.some((b) => b.name === targetBranch);
			if (!targetExists) {
				throw new Error(`Target branch "${targetBranch}" not found`);
			}

			const storeInput = {
				repoName,
				title,
				sourceBranch,
				targetBranch,
				authorName: authorName ?? "anonymous",
			};
			if (organizationName) {
				return store.create({ ...storeInput, organizationName });
			}
			return (
				store.create as (input: typeof storeInput) => Promise<PullRequest>
			)(storeInput);
		},

		async listPullRequests(locator: RepositoryTarget): Promise<PullRequest[]> {
			await ensureRepositoryExists(locator);
			return store.list(locator as RepositoryLocator);
		},

		async getPullRequest(
			locator: RepositoryTarget,
			id: number,
		): Promise<PullRequest> {
			return requirePullRequest(locator, id);
		},

		async mergePullRequest(
			locator: RepositoryTarget,
			id: number,
			options?: { fastForward?: boolean; message?: string },
		): Promise<{
			pullRequest: PullRequest;
			mergeResult: MergeResult;
		}> {
			const pr = await requirePullRequest(locator, id);
			if (pr.status !== "open") {
				throw new ConflictError(
					`Pull request #${id} is already ${pr.status} and cannot be merged`,
				);
			}

			const mergeStatus = await gitProvider.canMerge(
				locator as RepositoryLocator,
				pr.sourceBranch,
				pr.targetBranch,
			);

			if (mergeStatus.conflicts) {
				throw new ConflictError(
					`Merge conflicts detected: ${mergeStatus.conflictingFiles.length > 0 ? mergeStatus.conflictingFiles.join(", ") : "unknown files"}`,
					{ conflictingFiles: mergeStatus.conflictingFiles },
				);
			}

			const mergeOpts: MergeOptions = {};
			if (options?.fastForward) {
				mergeOpts.fastForward = options.fastForward;
			}
			mergeOpts.message =
				options?.message ?? `Merge pull request #${id}: ${pr.title}`;

			const mergeResult = await gitProvider.mergeBranch(
				locator as RepositoryLocator,
				pr.sourceBranch,
				pr.targetBranch,
				mergeOpts,
			);

			const updated = await store.update(locator as RepositoryLocator, id, {
				status: "merged",
				mergeCommitSha: mergeResult.mergedSha,
			});

			return { pullRequest: updated, mergeResult };
		},

		async checkMergeStatus(
			locator: RepositoryTarget,
			id: number,
		): Promise<MergeStatus> {
			const pr = await requirePullRequest(locator, id);

			return gitProvider.canMerge(
				locator as RepositoryLocator,
				pr.sourceBranch,
				pr.targetBranch,
			);
		},

		async getPullRequestDiff(
			locator: RepositoryTarget,
			id: number,
		): Promise<DiffFile[]> {
			const pr = await requirePullRequest(locator, id);

			return gitProvider.getDiff(
				locator as RepositoryLocator,
				pr.targetBranch,
				pr.sourceBranch,
			);
		},

		async listPullRequestComments(
			locator: RepositoryTarget,
			id: number,
		): Promise<PullRequestComment[]> {
			await requirePullRequest(locator, id);
			return store.listComments(locator as RepositoryLocator, id);
		},

		async addPullRequestFileComment(
			locator: RepositoryTarget,
			id: number,
			filePath: string,
			body: string,
			author: { id: string; name: string },
		): Promise<PullRequestComment> {
			const pr = await requirePullRequest(locator, id);
			if (pr.status !== "open") {
				throw new ConflictError(
					`Pull request #${id} is ${pr.status} and cannot be commented on`,
				);
			}

			const files = await gitProvider.getDiff(
				locator as RepositoryLocator,
				pr.targetBranch,
				pr.sourceBranch,
			);
			const fileExists = files.some(
				(file) => (file.newPath ?? file.oldPath) === filePath,
			);
			if (!fileExists) {
				throw new Error(
					`File "${filePath}" is not part of pull request #${id}`,
				);
			}

			return store.addComment(locator as RepositoryLocator, id, {
				target: { type: "file", filePath },
				body,
				authorId: author.id,
				authorName: author.name,
			});
		},

		async setPullRequestFileViewed(
			locator: RepositoryTarget,
			id: number,
			filePath: string,
			viewed: boolean,
		): Promise<PullRequest> {
			const pr = await requirePullRequest(locator, id);

			const files = await gitProvider.getDiff(
				locator as RepositoryLocator,
				pr.targetBranch,
				pr.sourceBranch,
			);
			const fileExists = files.some(
				(file) => (file.newPath ?? file.oldPath) === filePath,
			);
			if (!fileExists) {
				throw new Error(
					`File "${filePath}" is not part of pull request #${id}`,
				);
			}

			return store.setFileViewed(
				locator as RepositoryLocator,
				id,
				filePath,
				viewed,
			);
		},
	};
}

export type PullRequestService = ReturnType<typeof createPullRequestService>;
