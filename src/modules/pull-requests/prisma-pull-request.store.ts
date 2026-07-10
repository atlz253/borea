import { randomUUID } from "node:crypto";
import type { RepositoryLocator } from "#/modules/git";
import type { DatabaseProvider } from "#/platform/database";
import type { PullRequestStore } from "./pull-request.store";
import type {
	PullRequest,
	PullRequestComment,
	PullRequestStatus,
} from "./schemas";

function repoId(locator: RepositoryLocator): string {
	if ("userName" in locator) {
		return `users/${locator.userName}/${locator.repositoryName}`;
	}
	return `${locator.organizationName}/${locator.repositoryName}`;
}

function toPullRequest(row: {
	prNumber: number;
	title: string;
	sourceBranch: string;
	targetBranch: string;
	status: string;
	mergeCommitSha: string | null;
	authorName: string;
	createdAt: string;
	updatedAt: string;
	viewedFiles: string;
	repository: { organizationName: string | null; name: string };
}): PullRequest {
	return {
		id: row.prNumber,
		organizationName: row.repository.organizationName ?? "",
		repoName: row.repository.name,
		title: row.title,
		sourceBranch: row.sourceBranch,
		targetBranch: row.targetBranch,
		status: row.status as PullRequestStatus,
		mergeCommitSha: row.mergeCommitSha ?? undefined,
		authorName: row.authorName,
		viewedFiles: JSON.parse(row.viewedFiles) as string[],
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export class PrismaPullRequestStore implements PullRequestStore {
	constructor(private readonly db: DatabaseProvider) {}

	async create(input: {
		organizationName: string;
		repoName: string;
		title: string;
		sourceBranch: string;
		targetBranch: string;
		authorName: string;
	}): Promise<PullRequest> {
		const rid = repoId({
			organizationName: input.organizationName,
			repositoryName: input.repoName,
		});
		const now = new Date().toISOString();
		const prNumber = await this.db.transaction(async (tx) => {
			const counter = await tx.pullRequestCounter.upsert({
				where: { repositoryId: rid },
				update: { lastNumber: { increment: 1 } },
				create: {
					repositoryId: rid,
					lastNumber: 1,
				},
			});
			const next = counter.lastNumber;
			await tx.pullRequest.create({
				data: {
					repositoryId: rid,
					prNumber: next,
					title: input.title,
					sourceBranch: input.sourceBranch,
					targetBranch: input.targetBranch,
					status: "open",
					authorName: input.authorName,
					createdAt: now,
					updatedAt: now,
				},
			});
			return next;
		});
		return {
			id: prNumber,
			organizationName: input.organizationName,
			repoName: input.repoName,
			title: input.title,
			sourceBranch: input.sourceBranch,
			targetBranch: input.targetBranch,
			status: "open" as const,
			authorName: input.authorName,
			viewedFiles: [],
			createdAt: now,
			updatedAt: now,
		};
	}

	async list(locator: RepositoryLocator): Promise<PullRequest[]> {
		const rid = repoId(locator);
		const rows = await this.db.getClient().pullRequest.findMany({
			where: { repositoryId: rid },
			orderBy: { createdAt: "desc" },
			include: {
				repository: { select: { organizationName: true, name: true } },
			},
		});
		return rows.map(toPullRequest);
	}

	async get(
		locator: RepositoryLocator,
		id: number,
	): Promise<PullRequest | undefined> {
		const rid = repoId(locator);
		const row = await this.db.getClient().pullRequest.findUnique({
			where: {
				repositoryId_prNumber: { repositoryId: rid, prNumber: id },
			},
			include: {
				repository: { select: { organizationName: true, name: true } },
			},
		});
		if (!row) return undefined;
		return toPullRequest(row);
	}

	async update(
		locator: RepositoryLocator,
		id: number,
		data: Partial<PullRequest>,
	): Promise<PullRequest> {
		const rid = repoId(locator);
		const updateData: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
		};
		if (data.status !== undefined) updateData.status = data.status;
		if (data.mergeCommitSha !== undefined)
			updateData.mergeCommitSha = data.mergeCommitSha;
		if (data.title !== undefined) updateData.title = data.title;

		const row = await this.db.getClient().pullRequest.update({
			where: {
				repositoryId_prNumber: { repositoryId: rid, prNumber: id },
			},
			data: updateData,
			include: {
				repository: { select: { organizationName: true, name: true } },
			},
		});
		return toPullRequest(row);
	}

	async setFileViewed(
		locator: RepositoryLocator,
		id: number,
		filePath: string,
		viewed: boolean,
	): Promise<PullRequest> {
		const rid = repoId(locator);
		const existing = await this.db.getClient().pullRequest.findUnique({
			where: {
				repositoryId_prNumber: { repositoryId: rid, prNumber: id },
			},
			select: { viewedFiles: true },
		});
		if (!existing) {
			throw new Error("Pull request not found");
		}
		const files = new Set(JSON.parse(existing.viewedFiles) as string[]);
		if (viewed) {
			files.add(filePath);
		} else {
			files.delete(filePath);
		}
		const updated = await this.db.getClient().pullRequest.update({
			where: {
				repositoryId_prNumber: { repositoryId: rid, prNumber: id },
			},
			data: {
				viewedFiles: JSON.stringify([...files]),
				updatedAt: new Date().toISOString(),
			},
			include: {
				repository: { select: { organizationName: true, name: true } },
			},
		});
		return toPullRequest(updated);
	}

	async listComments(
		locator: RepositoryLocator,
		id: number,
	): Promise<PullRequestComment[]> {
		const rid = repoId(locator);
		const rows = await this.db.getClient().pullRequestComment.findMany({
			where: { repositoryId: rid, prNumber: id },
			orderBy: { createdAt: "asc" },
		});
		return rows.map((r) => ({
			id: r.id,
			target: {
				type: r.targetType as "file",
				filePath: r.targetFilePath,
			},
			body: r.body,
			authorId: r.authorId,
			authorName: r.authorName,
			createdAt: r.createdAt,
		}));
	}

	async addComment(
		locator: RepositoryLocator,
		id: number,
		input: {
			target: PullRequestComment["target"];
			body: string;
			authorId: string;
			authorName: string;
		},
	): Promise<PullRequestComment> {
		const rid = repoId(locator);
		const now = new Date().toISOString();
		const commentId = randomUUID();
		await this.db.getClient().pullRequestComment.create({
			data: {
				id: commentId,
				repositoryId: rid,
				prNumber: id,
				targetType: input.target.type,
				targetFilePath:
					input.target.type === "file" ? input.target.filePath : "",
				body: input.body,
				authorId: input.authorId,
				authorName: input.authorName,
				createdAt: now,
			},
		});
		return {
			id: commentId,
			target: input.target,
			body: input.body,
			authorId: input.authorId,
			authorName: input.authorName,
			createdAt: now,
		};
	}

	async deleteAll(locator: RepositoryLocator): Promise<void> {
		const rid = repoId(locator);
		await this.db.transaction(async (tx) => {
			await tx.pullRequestComment.deleteMany({
				where: { repositoryId: rid },
			});
			await tx.pullRequest.deleteMany({
				where: { repositoryId: rid },
			});
		});
	}
}
