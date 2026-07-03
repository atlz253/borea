export interface RepositoryInfo {
	organizationName?: string;
	name: string;
	description?: string;
	createdAt: Date;
}

export interface RepositoryLocator {
	organizationName: string;
	repositoryName: string;
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

export interface GetFileOptions {
	path: string;
	ref?: string;
	maxBytes: number;
}

interface FileContentBase {
	path: string;
	size: number;
}

export interface TextFileContent extends FileContentBase {
	status: "text";
	content: string;
}

export interface BinaryFileContent extends FileContentBase {
	status: "binary";
}

export interface TooLargeFileContent extends FileContentBase {
	status: "too-large";
}

export type FileContent =
	| TextFileContent
	| BinaryFileContent
	| TooLargeFileContent;

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

export interface MergeStatus {
	conflicts: boolean;
	fastForward: boolean;
	conflictingFiles: string[];
}

export interface MergeOptions {
	fastForward?: boolean;
	message?: string;
}

export interface MergeResult {
	mergedSha: string;
	fastForward: boolean;
}

export type DiffFileStatus = "added" | "modified" | "deleted" | "renamed";

export type DiffLineType = "context" | "added" | "removed";

export interface DiffLine {
	type: DiffLineType;
	oldLineNumber: number | null;
	newLineNumber: number | null;
	content: string;
}

export interface DiffHunk {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
	lines: DiffLine[];
}

export interface DiffFile {
	oldPath: string | null;
	newPath: string | null;
	status: DiffFileStatus;
	hunks: DiffHunk[];
	isBinary: boolean;
}

export interface CommitDetail {
	sha: string;
	shortSha: string;
	authorName: string;
	authorEmail: string;
	authoredAt: Date;
	committedAt: Date;
	subject: string;
	parentSha: string | null;
}

export interface GetCommitDiffResult {
	commit: CommitDetail;
	files: DiffFile[];
}

export interface GitProvider {
	init(
		locator: RepositoryLocator | string,
		description?: string,
	): Promise<RepositoryInfo>;
	delete(locator: RepositoryLocator): Promise<void>;
	list(organizationName?: string): Promise<RepositoryInfo[]>;
	get(locator: RepositoryLocator): Promise<RepositoryInfo | undefined>;
	exists(locator: RepositoryLocator): Promise<boolean>;
	listFiles(
		locator: RepositoryLocator,
		options?: ListFilesOptions,
	): Promise<TreeEntry[]>;
	getFile(
		locator: RepositoryLocator,
		options: GetFileOptions,
	): Promise<FileContent>;
	advertiseRefs(
		locator: RepositoryLocator,
		service: GitService,
	): Promise<ReadableStream<Uint8Array>>;
	invokeService(
		locator: RepositoryLocator,
		service: GitService,
		input: ReadableStream<Uint8Array>,
	): Promise<ReadableStream<Uint8Array>>;
	listBranches(locator: RepositoryLocator): Promise<BranchInfo[]>;
	createBranch(
		locator: RepositoryLocator,
		branch: string,
		fromRef?: string,
	): Promise<BranchInfo>;
	listCommits(
		locator: RepositoryLocator,
		options?: ListCommitsOptions,
	): Promise<CommitInfo[]>;
	countCommits(locator: RepositoryLocator, ref?: string): Promise<number>;
	canMerge(
		locator: RepositoryLocator,
		head: string,
		base: string,
	): Promise<MergeStatus>;
	mergeBranch(
		locator: RepositoryLocator,
		head: string,
		base: string,
		options?: MergeOptions,
	): Promise<MergeResult>;
	getCommit(locator: RepositoryLocator, sha: string): Promise<CommitDetail>;
	getCommitDiff(
		locator: RepositoryLocator,
		sha: string,
	): Promise<GetCommitDiffResult>;
	getDiff(
		locator: RepositoryLocator,
		base: string,
		head: string,
	): Promise<DiffFile[]>;
}
