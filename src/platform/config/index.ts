import { logger } from "#/platform/logger";

const ENV_REPOSITORIES_PATH = "REPOSITORIES_PATH";
const ENV_PULL_REQUESTS_PATH = "PULL_REQUESTS_PATH";
const ENV_ORGANIZATIONS_PATH = "ORGANIZATIONS_PATH";
const ENV_ORGANIZATION_MODE = "ORGANIZATION_MODE";
const ENV_GIT_BIN_PATH = "GIT_BIN_PATH";
const ENV_AUTH_MODE = "AUTH_MODE";
const ENV_USERS_PATH = "USERS_PATH";
const ENV_SESSION_SECRET = "SESSION_SECRET";
const ENV_DEFAULT_USER_NAME = "DEFAULT_USER_NAME";
const ENV_ALLOW_NOAUTH_IN_PRODUCTION = "ALLOW_NOAUTH_IN_PRODUCTION";
const MIN_SESSION_SECRET_LENGTH = 32;

export type OrganizationMode = "multi" | "single";
export type AuthMode = "full" | "noauth";

export interface AppConfig {
	storagePath: string;
	pullRequestsPath: string;
	organizationsPath: string;
	organizationMode: OrganizationMode;
	gitBinPath: string;
	authMode: AuthMode;
	usersPath: string;
	sessionSecret?: string;
	defaultUserName: string;
}

let cached: AppConfig | undefined;

function readOrganizationMode(): OrganizationMode {
	const organizationMode = process.env[ENV_ORGANIZATION_MODE] ?? "multi";
	if (organizationMode !== "multi" && organizationMode !== "single") {
		throw new Error(
			`${ENV_ORGANIZATION_MODE} must be either "multi" or "single"`,
		);
	}
	return organizationMode;
}

function readAuthMode(): AuthMode {
	const authMode = process.env[ENV_AUTH_MODE] ?? "full";
	if (authMode !== "full" && authMode !== "noauth") {
		throw new Error(`${ENV_AUTH_MODE} must be either "full" or "noauth"`);
	}
	return authMode;
}

function validateAuthenticationConfig(
	authMode: AuthMode,
	organizationMode: OrganizationMode,
	sessionSecret: string | undefined,
): void {
	if (authMode === "full" && organizationMode === "single") {
		throw new Error(
			`${ENV_ORGANIZATION_MODE}=single is only supported with ${ENV_AUTH_MODE}=noauth`,
		);
	}
	if (
		authMode === "full" &&
		(!sessionSecret || sessionSecret.length < MIN_SESSION_SECRET_LENGTH)
	) {
		throw new Error(
			`${ENV_SESSION_SECRET} must contain at least 32 characters in full authentication mode`,
		);
	}
	if (
		authMode === "noauth" &&
		process.env.NODE_ENV === "production" &&
		process.env[ENV_ALLOW_NOAUTH_IN_PRODUCTION] !== "true"
	) {
		throw new Error(
			`${ENV_AUTH_MODE}=noauth is prohibited in production unless ${ENV_ALLOW_NOAUTH_IN_PRODUCTION}=true`,
		);
	}
	if (
		authMode === "noauth" &&
		process.env.NODE_ENV === "production" &&
		process.env[ENV_ALLOW_NOAUTH_IN_PRODUCTION] === "true"
	) {
		logger.warn(
			"Running in NoAuth mode in production. Authentication and access control are disabled.",
		);
	}
}

export function getConfig(): AppConfig {
	if (cached) {
		return cached;
	}
	const organizationMode = readOrganizationMode();
	const authMode = readAuthMode();
	const sessionSecret = process.env[ENV_SESSION_SECRET];
	validateAuthenticationConfig(authMode, organizationMode, sessionSecret);
	cached = {
		storagePath: process.env[ENV_REPOSITORIES_PATH] ?? "./data/repositories",
		pullRequestsPath:
			process.env[ENV_PULL_REQUESTS_PATH] ?? "./data/pull-requests",
		organizationsPath:
			process.env[ENV_ORGANIZATIONS_PATH] ?? "./data/organizations",
		organizationMode,
		gitBinPath: process.env[ENV_GIT_BIN_PATH] ?? "git",
		authMode,
		usersPath: process.env[ENV_USERS_PATH] ?? "./data/users",
		sessionSecret,
		defaultUserName: process.env[ENV_DEFAULT_USER_NAME] ?? "anonymous",
	};
	return cached;
}

export function resetConfigForTests(): void {
	cached = undefined;
}
