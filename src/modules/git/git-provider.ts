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

export interface GitProvider {
	init(name: string, description?: string): Promise<RepositoryInfo>;
	list(): Promise<RepositoryInfo[]>;
	exists(name: string): Promise<boolean>;
	listFiles(name: string, options?: ListFilesOptions): Promise<TreeEntry[]>;
}
