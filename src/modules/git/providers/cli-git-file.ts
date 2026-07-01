import { existsSync } from "node:fs";
import path from "node:path";
import { execa } from "execa";
import type { FileContent, GetFileOptions } from "../git-provider";
import { refExists } from "./cli-git-helpers";
import { DEFAULT_REF } from "./cli-git-parsers";
import { normalizePath, resolvePath, validateName } from "./cli-git-validators";

export async function readFileContent(
	gitBin: string,
	storagePath: string,
	name: string,
	options: GetFileOptions,
): Promise<FileContent> {
	validateName(name);
	const repoPath = resolvePath(storagePath, name);

	if (!existsSync(repoPath) || !existsSync(path.join(repoPath, "HEAD"))) {
		throw new Error(`Repository "${name}" not found`);
	}

	const filePath = normalizePath(options.path);
	if (!filePath) {
		throw new Error("File path is required");
	}
	if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 0) {
		throw new Error("File size limit must be a non-negative integer");
	}

	const ref = options.ref ?? DEFAULT_REF;
	if (!(await refExists(gitBin, repoPath, ref))) {
		throw new Error(`Ref "${ref}" not found in repository "${name}"`);
	}

	const objectSpec = `${ref}:${filePath}`;
	const { objectType, size } = await getBlobMetadata(
		gitBin,
		repoPath,
		objectSpec,
		name,
		filePath,
		ref,
	);

	if (objectType !== "blob") {
		throw new Error(`Path "${filePath}" is not a file`);
	}
	if (!Number.isSafeInteger(size) || size < 0) {
		throw new Error(`Unable to determine size of file "${filePath}"`);
	}
	if (size > options.maxBytes) {
		return { status: "too-large", path: filePath, size };
	}

	const { stdout } = await execa(
		gitBin,
		["--git-dir", repoPath, "cat-file", "blob", objectSpec],
		{ encoding: "buffer", stripFinalNewline: false },
	);
	const bytes = new Uint8Array(stdout);
	if (bytes.includes(0)) {
		return { status: "binary", path: filePath, size };
	}

	try {
		const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		return { status: "text", path: filePath, size, content };
	} catch {
		return { status: "binary", path: filePath, size };
	}
}

async function getBlobMetadata(
	gitBin: string,
	repoPath: string,
	objectSpec: string,
	name: string,
	filePath: string,
	ref: string,
): Promise<{ objectType: string; size: number }> {
	try {
		const typeResult = await execa(gitBin, [
			"--git-dir",
			repoPath,
			"cat-file",
			"-t",
			objectSpec,
		]);
		const sizeResult = await execa(gitBin, [
			"--git-dir",
			repoPath,
			"cat-file",
			"-s",
			objectSpec,
		]);
		return {
			objectType: typeResult.stdout.trim(),
			size: Number.parseInt(sizeResult.stdout.trim(), 10),
		};
	} catch {
		throw new Error(
			`File "${filePath}" not found in repository "${name}" at ref "${ref}"`,
		);
	}
}
