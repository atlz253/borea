export type {
	BranchInfo,
	CommitDetail,
	CommitInfo,
	DiffFile,
	DiffFileStatus,
	DiffHunk,
	DiffLine,
	DiffLineType,
	FileContent,
	GetCommitDiffResult,
	GetFileOptions,
	GitProvider,
	GitService,
	ListCommitsOptions,
	ListFilesOptions,
	MergeOptions,
	MergeResult,
	MergeStatus,
	RepositoryInfo,
	RepositoryLocator,
	TreeEntry,
	TreeEntryType,
} from "./git-provider";
export {
	CliGitProvider,
	gitProvider,
} from "./providers/cli-git-provider";
export type { SmartHttpPath } from "./smart-http.service";
export {
	contentTypeFor,
	formatAdvertisement,
	parseSmartHttpPath,
} from "./smart-http.service";
