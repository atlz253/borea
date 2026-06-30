const ENV_REPOSITORIES_PATH = "REPOSITORIES_PATH";
const ENV_PULL_REQUESTS_PATH = "PULL_REQUESTS_PATH";
const ENV_GIT_BIN_PATH = "GIT_BIN_PATH";

export interface AppConfig {
	storagePath: string;
	pullRequestsPath: string;
	gitBinPath: string;
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
	if (cached) {
		return cached;
	}
	cached = {
		storagePath: process.env[ENV_REPOSITORIES_PATH] ?? "./data/repositories",
		pullRequestsPath:
			process.env[ENV_PULL_REQUESTS_PATH] ?? "./data/pull-requests",
		gitBinPath: process.env[ENV_GIT_BIN_PATH] ?? "git",
	};
	return cached;
}
