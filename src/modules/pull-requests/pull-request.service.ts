import type {
	DiffFile,
	GitProvider,
	MergeOptions,
	MergeResult,
	MergeStatus,
} from "#/modules/git";
import { ConflictError, NotFoundError } from "#/platform/errors";
import type { PullRequestStore } from "./pull-request.store";
import type { PullRequest } from "./schemas";

export function createPullRequestService(
	gitProvider: GitProvider,
	store: PullRequestStore,
) {
	async function ensureRepositoryExists(repoName: string): Promise<void> {
		if (!(await gitProvider.exists(repoName))) {
			throw new NotFoundError(`Repository "${repoName}" not found`);
		}
	}

	async function requirePullRequest(
		repoName: string,
		id: number,
	): Promise<PullRequest> {
		await ensureRepositoryExists(repoName);
		const pullRequest = await store.get(repoName, id);
		if (!pullRequest) {
			throw new NotFoundError(`Pull request #${id} not found`);
		}
		return pullRequest;
	}

	return {
		async createPullRequest(input: {
			repoName: string;
			title: string;
			sourceBranch: string;
			targetBranch: string;
			authorName?: string;
		}): Promise<PullRequest> {
			const { repoName, title, sourceBranch, targetBranch, authorName } = input;

			if (sourceBranch === targetBranch) {
				throw new Error("Source and target branches must be different");
			}

			const branches = await gitProvider.listBranches(repoName);
			const sourceExists = branches.some((b) => b.name === sourceBranch);
			if (!sourceExists) {
				throw new Error(`Source branch "${sourceBranch}" not found`);
			}
			const targetExists = branches.some((b) => b.name === targetBranch);
			if (!targetExists) {
				throw new Error(`Target branch "${targetBranch}" not found`);
			}

			return store.create({
				repoName,
				title,
				sourceBranch,
				targetBranch,
				authorName: authorName ?? "anonymous",
			});
		},

		async listPullRequests(repoName: string): Promise<PullRequest[]> {
			await ensureRepositoryExists(repoName);
			return store.list(repoName);
		},

		async getPullRequest(repoName: string, id: number): Promise<PullRequest> {
			return requirePullRequest(repoName, id);
		},

		async mergePullRequest(
			repoName: string,
			id: number,
			options?: { fastForward?: boolean; message?: string },
		): Promise<{
			pullRequest: PullRequest;
			mergeResult: MergeResult;
		}> {
			const pr = await requirePullRequest(repoName, id);
			if (pr.status !== "open") {
				throw new ConflictError(
					`Pull request #${id} is already ${pr.status} and cannot be merged`,
				);
			}

			const mergeStatus = await gitProvider.canMerge(
				repoName,
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
				repoName,
				pr.sourceBranch,
				pr.targetBranch,
				mergeOpts,
			);

			const updated = await store.update(repoName, id, {
				status: "merged",
				mergeCommitSha: mergeResult.mergedSha,
			});

			return { pullRequest: updated, mergeResult };
		},

		async checkMergeStatus(repoName: string, id: number): Promise<MergeStatus> {
			const pr = await requirePullRequest(repoName, id);

			return gitProvider.canMerge(repoName, pr.sourceBranch, pr.targetBranch);
		},

		async getPullRequestDiff(
			repoName: string,
			id: number,
		): Promise<DiffFile[]> {
			const pr = await requirePullRequest(repoName, id);

			return gitProvider.getDiff(repoName, pr.targetBranch, pr.sourceBranch);
		},

		async setPullRequestFileViewed(
			repoName: string,
			id: number,
			filePath: string,
			viewed: boolean,
		): Promise<PullRequest> {
			const pr = await requirePullRequest(repoName, id);

			const files = await gitProvider.getDiff(
				repoName,
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

			return store.setFileViewed(repoName, id, filePath, viewed);
		},
	};
}

export type PullRequestService = ReturnType<typeof createPullRequestService>;
