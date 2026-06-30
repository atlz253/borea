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
}
