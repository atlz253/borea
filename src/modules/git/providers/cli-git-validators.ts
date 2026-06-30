import path from "node:path";

const REPO_NAME_RE = /^[a-zA-Z0-9._-]+$/;

const MAX_NAME_LENGTH = 100;
const MAX_PATH_LENGTH = 1024;

export const DEFAULT_DESC =
	"Unnamed repository; edit this file to 'name' the repository.";

export function resolvePath(storagePath: string, name: string): string {
	const resolved = path.resolve(storagePath, name);
	const root = path.resolve(storagePath);
	if (!resolved.startsWith(root)) {
		throw new Error("Invalid repository name");
	}
	return resolved;
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
