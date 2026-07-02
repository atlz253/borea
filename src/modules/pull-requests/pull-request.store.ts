import { existsSync } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { RepositoryLocator } from "#/modules/git";
import { getConfig } from "#/platform/config";
import { type PullRequest, pullRequestSchema } from "./schemas";

interface RepoMeta {
	nextId: number;
}

type RepositoryTarget = RepositoryLocator | string;

export interface PullRequestStore {
	create(input: {
		organizationName: string;
		repoName: string;
		title: string;
		sourceBranch: string;
		targetBranch: string;
		authorName: string;
	}): Promise<PullRequest>;
	list(locator: RepositoryLocator): Promise<PullRequest[]>;
	get(locator: RepositoryLocator, id: number): Promise<PullRequest | undefined>;
	update(
		locator: RepositoryLocator,
		id: number,
		data: Partial<PullRequest>,
	): Promise<PullRequest>;
	setFileViewed(
		locator: RepositoryLocator,
		id: number,
		filePath: string,
		viewed: boolean,
	): Promise<PullRequest>;
	deleteAll(locator: RepositoryLocator): Promise<void>;
}

export class FileSystemPullRequestStore implements PullRequestStore {
	private readonly basePath: string;
	private readonly writeLocks = new Map<string, Promise<void>>();

	constructor(basePath?: string) {
		const cfg = getConfig();
		this.basePath = path.resolve(basePath ?? cfg.pullRequestsPath);
	}

	async create(input: {
		organizationName?: string;
		repoName: string;
		title: string;
		sourceBranch: string;
		targetBranch: string;
		authorName: string;
	}): Promise<PullRequest> {
		const repoDir = input.organizationName
			? path.join(this.basePath, input.organizationName, input.repoName)
			: path.join(this.basePath, input.repoName);
		await mkdir(repoDir, { recursive: true });

		const id = await this.nextId(repoDir);
		const now = new Date().toISOString();

		const pr: PullRequest = {
			id,
			organizationName: input.organizationName ?? "default",
			repoName: input.repoName,
			title: input.title,
			sourceBranch: input.sourceBranch,
			targetBranch: input.targetBranch,
			status: "open",
			authorName: input.authorName,
			viewedFiles: [],
			createdAt: now,
			updatedAt: now,
		};

		await this.writePrFile(repoDir, pr);
		return pr;
	}

	async list(locator: RepositoryTarget): Promise<PullRequest[]> {
		const repoDir = this.repoDir(locator);
		if (!existsSync(repoDir)) {
			return [];
		}

		const entries = await readdir(repoDir, { withFileTypes: true });
		const prs: PullRequest[] = [];

		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(".json")) {
				continue;
			}
			if (entry.name === "_meta.json") {
				continue;
			}
			try {
				const content = await readFile(path.join(repoDir, entry.name), "utf-8");
				const pr = pullRequestSchema.parse(JSON.parse(content));
				prs.push(pr);
			} catch {}
		}

		prs.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		return prs;
	}

	async get(
		locator: RepositoryTarget,
		id: number,
	): Promise<PullRequest | undefined> {
		const filePath = this.prFilePath(locator, id);
		if (!existsSync(filePath)) {
			return undefined;
		}
		try {
			const content = await readFile(filePath, "utf-8");
			return pullRequestSchema.parse(JSON.parse(content));
		} catch {
			return undefined;
		}
	}

	async update(
		locator: RepositoryTarget,
		id: number,
		data: Partial<PullRequest>,
	): Promise<PullRequest> {
		return this.withWriteLock(locator, id, async () => {
			const existing = await this.get(locator, id);
			if (!existing) {
				throw new Error(
					`Pull request #${id} not found in "${this.repositoryName(locator)}"`,
				);
			}

			const updated: PullRequest = {
				...existing,
				...data,
				id: existing.id,
				organizationName: existing.organizationName,
				repoName: existing.repoName,
				updatedAt: new Date().toISOString(),
			};

			const repoDir = this.repoDir(locator);
			await this.writePrFile(repoDir, updated);
			return updated;
		});
	}

	async setFileViewed(
		locator: RepositoryTarget,
		id: number,
		filePath: string,
		viewed: boolean,
	): Promise<PullRequest> {
		return this.withWriteLock(locator, id, async () => {
			const existing = await this.get(locator, id);
			if (!existing) {
				throw new Error(
					`Pull request #${id} not found in "${this.repositoryName(locator)}"`,
				);
			}

			const viewedFiles = new Set(existing.viewedFiles);
			if (viewed) {
				viewedFiles.add(filePath);
			} else {
				viewedFiles.delete(filePath);
			}

			const updated: PullRequest = {
				...existing,
				viewedFiles: [...viewedFiles],
				updatedAt: new Date().toISOString(),
			};
			const repoDir = this.repoDir(locator);
			await this.writePrFile(repoDir, updated);
			return updated;
		});
	}

	async deleteAll(locator: RepositoryTarget): Promise<void> {
		await rm(this.repoDir(locator), {
			recursive: true,
			force: true,
		});
	}

	private repoDir(locator: RepositoryTarget): string {
		if (typeof locator === "string") {
			return path.resolve(this.basePath, locator);
		}
		return path.resolve(
			this.basePath,
			locator.organizationName,
			locator.repositoryName,
		);
	}

	private prFilePath(locator: RepositoryTarget, id: number): string {
		return path.resolve(this.repoDir(locator), `${id}.json`);
	}

	private async writePrFile(repoDir: string, pr: PullRequest): Promise<void> {
		const tmpPath = path.join(repoDir, `${pr.id}.tmp`);
		const finalPath = path.join(repoDir, `${pr.id}.json`);
		await writeFile(tmpPath, JSON.stringify(pr, null, "\t"), "utf-8");
		await rename(tmpPath, finalPath);
	}

	private async withWriteLock<T>(
		locator: RepositoryTarget,
		id: number,
		operation: () => Promise<T>,
	): Promise<T> {
		const key =
			typeof locator === "string"
				? `${locator}:${id}`
				: `${locator.organizationName}:${locator.repositoryName}:${id}`;
		const previous = this.writeLocks.get(key) ?? Promise.resolve();
		let release: (() => void) | undefined;
		const current = new Promise<void>((resolve) => {
			release = resolve;
		});
		const queued = previous.then(() => current);
		this.writeLocks.set(key, queued);

		await previous;
		try {
			return await operation();
		} finally {
			release?.();
			if (this.writeLocks.get(key) === queued) {
				this.writeLocks.delete(key);
			}
		}
	}

	private repositoryName(locator: RepositoryTarget): string {
		return typeof locator === "string" ? locator : locator.repositoryName;
	}

	private async nextId(repoDir: string): Promise<number> {
		const metaPath = path.join(repoDir, "_meta.json");
		let meta: RepoMeta;

		if (existsSync(metaPath)) {
			try {
				const content = await readFile(metaPath, "utf-8");
				meta = JSON.parse(content) as RepoMeta;
			} catch {
				meta = { nextId: 1 };
			}
		} else {
			meta = { nextId: 1 };
		}

		const id = meta.nextId;
		meta.nextId += 1;

		const tmpMeta = path.join(repoDir, "_meta.tmp");
		await writeFile(tmpMeta, JSON.stringify(meta, null, "\t"), "utf-8");
		await rename(tmpMeta, metaPath);

		return id;
	}
}

export const pullRequestStore: PullRequestStore =
	new FileSystemPullRequestStore();
