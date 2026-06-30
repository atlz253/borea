const ENV_REPOSITORIES_PATH = "REPOSITORIES_PATH";
const ENV_GIT_BIN_PATH = "GIT_BIN_PATH";

export interface AppConfig {
	storagePath: string;
	gitBinPath: string;
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
	if (cached) {
		return cached;
	}
	cached = {
		storagePath: process.env[ENV_REPOSITORIES_PATH] ?? "./data/repositories",
		gitBinPath: process.env[ENV_GIT_BIN_PATH] ?? "git",
	};
	return cached;
}
