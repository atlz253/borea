export type {
	BranchInfo,
	CommitInfo,
	GitProvider,
	GitService,
	ListCommitsOptions,
	ListFilesOptions,
	RepositoryInfo,
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
