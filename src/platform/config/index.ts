const ENV_REPOSITORIES_PATH = "REPOSITORIES_PATH";
const ENV_PULL_REQUESTS_PATH = "PULL_REQUESTS_PATH";
const ENV_ORGANIZATIONS_PATH = "ORGANIZATIONS_PATH";
const ENV_ORGANIZATION_MODE = "ORGANIZATION_MODE";
const ENV_GIT_BIN_PATH = "GIT_BIN_PATH";

export type OrganizationMode = "multi" | "single";

export interface AppConfig {
	storagePath: string;
	pullRequestsPath: string;
	organizationsPath: string;
	organizationMode: OrganizationMode;
	gitBinPath: string;
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
	if (cached) {
		return cached;
	}
	const organizationMode = process.env[ENV_ORGANIZATION_MODE] ?? "multi";
	if (organizationMode !== "multi" && organizationMode !== "single") {
		throw new Error(
			`${ENV_ORGANIZATION_MODE} must be either "multi" or "single"`,
		);
	}
	cached = {
		storagePath: process.env[ENV_REPOSITORIES_PATH] ?? "./data/repositories",
		pullRequestsPath:
			process.env[ENV_PULL_REQUESTS_PATH] ?? "./data/pull-requests",
		organizationsPath:
			process.env[ENV_ORGANIZATIONS_PATH] ?? "./data/organizations",
		organizationMode,
		gitBinPath: process.env[ENV_GIT_BIN_PATH] ?? "git",
	};
	return cached;
}
