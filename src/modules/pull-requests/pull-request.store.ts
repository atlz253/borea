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
import { getConfig } from "#/platform/config";
import { type PullRequest, pullRequestSchema } from "./schemas";

interface RepoMeta {
	nextId: number;
}

export interface PullRequestStore {
	create(input: {
		repoName: string;
		title: string;
		sourceBranch: string;
		targetBranch: string;
		authorName: string;
	}): Promise<PullRequest>;
	list(repoName: string): Promise<PullRequest[]>;
	get(repoName: string, id: number): Promise<PullRequest | undefined>;
	update(
		repoName: string,
		id: number,
		data: Partial<PullRequest>,
	): Promise<PullRequest>;
	setFileViewed(
		repoName: string,
		id: number,
		filePath: string,
		viewed: boolean,
	): Promise<PullRequest>;
	deleteAll(repoName: string): Promise<void>;
}

export class FileSystemPullRequestStore implements PullRequestStore {
	private readonly basePath: string;
	private readonly writeLocks = new Map<string, Promise<void>>();

	constructor(basePath?: string) {
		const cfg = getConfig();
		this.basePath = path.resolve(basePath ?? cfg.pullRequestsPath);
	}

	async create(input: {
		repoName: string;
		title: string;
		sourceBranch: string;
		targetBranch: string;
		authorName: string;
	}): Promise<PullRequest> {
		const repoDir = path.join(this.basePath, input.repoName);
		await mkdir(repoDir, { recursive: true });

		const id = await this.nextId(repoDir);
		const now = new Date().toISOString();

		const pr: PullRequest = {
			id,
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

	async list(repoName: string): Promise<PullRequest[]> {
		const repoDir = path.join(this.basePath, repoName);
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

	async get(repoName: string, id: number): Promise<PullRequest | undefined> {
		const filePath = this.prFilePath(repoName, id);
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
		repoName: string,
		id: number,
		data: Partial<PullRequest>,
	): Promise<PullRequest> {
		return this.withWriteLock(repoName, id, async () => {
			const existing = await this.get(repoName, id);
			if (!existing) {
				throw new Error(`Pull request #${id} not found in "${repoName}"`);
			}

			const updated: PullRequest = {
				...existing,
				...data,
				id: existing.id,
				repoName: existing.repoName,
				updatedAt: new Date().toISOString(),
			};

			const repoDir = path.join(this.basePath, repoName);
			await this.writePrFile(repoDir, updated);
			return updated;
		});
	}

	async setFileViewed(
		repoName: string,
		id: number,
		filePath: string,
		viewed: boolean,
	): Promise<PullRequest> {
		return this.withWriteLock(repoName, id, async () => {
			const existing = await this.get(repoName, id);
			if (!existing) {
				throw new Error(`Pull request #${id} not found in "${repoName}"`);
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
			const repoDir = path.join(this.basePath, repoName);
			await this.writePrFile(repoDir, updated);
			return updated;
		});
	}

	async deleteAll(repoName: string): Promise<void> {
		await rm(path.join(this.basePath, repoName), {
			recursive: true,
			force: true,
		});
	}

	private prFilePath(repoName: string, id: number): string {
		return path.resolve(this.basePath, repoName, `${id}.json`);
	}

	private async writePrFile(repoDir: string, pr: PullRequest): Promise<void> {
		const tmpPath = path.join(repoDir, `${pr.id}.tmp`);
		const finalPath = path.join(repoDir, `${pr.id}.json`);
		await writeFile(tmpPath, JSON.stringify(pr, null, "\t"), "utf-8");
		await rename(tmpPath, finalPath);
	}

	private async withWriteLock<T>(
		repoName: string,
		id: number,
		operation: () => Promise<T>,
	): Promise<T> {
		const key = `${repoName}:${id}`;
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
