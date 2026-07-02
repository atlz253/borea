import path from "node:path";

const REPO_NAME_RE = /^[a-zA-Z0-9._-]+$/;

const MAX_NAME_LENGTH = 100;
const MAX_PATH_LENGTH = 1024;

export const DEFAULT_DESC =
	"Unnamed repository; edit this file to 'name' the repository.";

export function resolvePath(
	storagePath: string,
	organizationName: string,
	repositoryName: string,
): string {
	validateOrganizationName(organizationName);
	validateName(repositoryName);
	const resolved = path.resolve(storagePath, organizationName, repositoryName);
	const root = path.resolve(storagePath);
	if (!resolved.startsWith(`${root}${path.sep}`)) {
		throw new Error("Invalid repository name");
	}
	return resolved;
}

export function validateOrganizationName(name: string): void {
	if (!name || !/^[a-z0-9._-]+$/.test(name)) {
		throw new Error("Invalid organization name");
	}
	if (name === "." || name === ".." || name.startsWith(".")) {
		throw new Error("Organization name cannot start with a dot");
	}
	if (name.length > MAX_NAME_LENGTH) {
		throw new Error("Organization name is too long (max 100 characters)");
	}
}

export function validateName(name: string): void {
	if (!name) {
		throw new Error("Repository name is required");
	}
	if (!REPO_NAME_RE.test(name)) {
		throw new Error(
			"Repository name must contain only letters, numbers, dots, hyphens, and underscores",
		);
	}
	if (name === "." || name === ".." || name.startsWith(".")) {
		throw new Error("Repository name cannot start with a dot");
	}
	if (name.length > MAX_NAME_LENGTH) {
		throw new Error("Repository name is too long (max 100 characters)");
	}
	if (name.toLowerCase().endsWith(".git")) {
		throw new Error("Repository name cannot end with .git");
	}
}

export function validatePath(p: string): void {
	if (p.includes("\0")) {
		throw new Error("Path cannot contain null bytes");
	}
	if (p.length > MAX_PATH_LENGTH) {
		throw new Error("Path is too long");
	}
	for (const seg of p.split("/")) {
		if (seg === "..") {
			throw new Error("Path cannot contain parent-directory segments");
		}
	}
}

export function normalizePath(p: string | undefined): string | undefined {
	if (!p || p.length === 0) {
		return undefined;
	}
	validatePath(p);
	return p;
}

const SHA_RE = /^[0-9a-f]{7,40}$/;

export function validateSha(sha: string): void {
	if (!sha) {
		throw new Error("SHA is required");
	}
	if (!SHA_RE.test(sha)) {
		throw new Error("SHA must be a 7-40 character hex string");
	}
}
