export interface RepositoryInfo {
	name: string;
	description?: string;
	createdAt: Date;
}

export type TreeEntryType = "blob" | "tree";

export interface TreeEntry {
	name: string;
	type: TreeEntryType;
	mode: string;
	size?: number;
}

export interface ListFilesOptions {
	path?: string;
	ref?: string;
}

export type GitService = "git-upload-pack" | "git-receive-pack";

export interface BranchInfo {
	name: string;
	isHead: boolean;
}

export interface CommitInfo {
	sha: string;
	shortSha: string;
	authorName: string;
	authorEmail: string;
	authoredAt: Date;
	committedAt: Date;
	subject: string;
}

export interface ListCommitsOptions {
	ref?: string;
	limit?: number;
}

export interface GitProvider {
	init(name: string, description?: string): Promise<RepositoryInfo>;
	list(): Promise<RepositoryInfo[]>;
	exists(name: string): Promise<boolean>;
	listFiles(name: string, options?: ListFilesOptions): Promise<TreeEntry[]>;
	advertiseRefs(
		name: string,
		service: GitService,
	): Promise<ReadableStream<Uint8Array>>;
	invokeService(
		name: string,
		service: GitService,
		input: ReadableStream<Uint8Array>,
	): Promise<ReadableStream<Uint8Array>>;
	listBranches(name: string): Promise<BranchInfo[]>;
	createBranch(
		name: string,
		branch: string,
		fromRef?: string,
	): Promise<BranchInfo>;
	listCommits(
		name: string,
		options?: ListCommitsOptions,
	): Promise<CommitInfo[]>;
	countCommits(name: string, ref?: string): Promise<number>;
}
