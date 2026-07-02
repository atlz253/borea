import { Readable } from "node:stream";
import { execa } from "execa";
import type { GitService } from "../git-provider";
import { gitCommandName } from "./cli-git-helpers";

export function advertiseRefs(
	gitBin: string,
	repositoryPath: string,
	service: GitService,
): ReadableStream<Uint8Array> {
	const subprocess = execa(gitBin, [
		"--git-dir",
		repositoryPath,
		gitCommandName(service),
		"--stateless-rpc",
		"--advertise-refs",
		repositoryPath,
	]);
	return Readable.toWeb(subprocess.stdout) as ReadableStream<Uint8Array>;
}

export function invokeService(
	gitBin: string,
	repositoryPath: string,
	service: GitService,
	input: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
	const subprocess = execa(gitBin, [
		"--git-dir",
		repositoryPath,
		gitCommandName(service),
		"--stateless-rpc",
		repositoryPath,
	]);
	Readable.fromWeb(input as never).pipe(subprocess.stdin);
	subprocess.catch(() => {});
	return Readable.toWeb(subprocess.stdout) as ReadableStream<Uint8Array>;
}
