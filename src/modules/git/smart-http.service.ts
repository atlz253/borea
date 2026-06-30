import type { GitService } from "./git-provider";

const GIT_DOT_SUFFIX_LEN = 4;
const PKT_LINE_LEN_PREFIX = 4;
const HEX_RADIX = 16;
const PKT_LINE_HEADER_WIDTH = 4;

export interface SmartHttpPath {
	repoName: string;
	endpoint: "info/refs" | "git-upload-pack" | "git-receive-pack" | "unknown";
	service: GitService;
}

export function parseSmartHttpPath(
	splat: string,
	searchParams: URLSearchParams,
): SmartHttpPath {
	const parts = splat.split("/");
	if (parts.length < 2) {
		return { repoName: "", endpoint: "unknown", service: "git-upload-pack" };
	}

	const rawName = parts[0];
	const endpoint = parts.slice(1).join("/");

	const repoName = rawName.endsWith(".git")
		? rawName.slice(0, -GIT_DOT_SUFFIX_LEN)
		: rawName;

	if (endpoint === "info/refs") {
		const svc = searchParams.get("service");
		if (svc === "git-receive-pack") {
			return {
				repoName,
				endpoint: "info/refs",
				service: "git-receive-pack",
			};
		}
		return {
			repoName,
			endpoint: "info/refs",
			service: "git-upload-pack",
		};
	}

	if (endpoint === "git-upload-pack") {
		return {
			repoName,
			endpoint: "git-upload-pack",
			service: "git-upload-pack",
		};
	}

	return { repoName, endpoint: "unknown", service: "git-upload-pack" };
}

const CONTENT_TYPES: Record<GitService, { advertise: string; result: string }> =
	{
		"git-upload-pack": {
			advertise: "application/x-git-upload-pack-advertisement",
			result: "application/x-git-upload-pack-result",
		},
		"git-receive-pack": {
			advertise: "application/x-git-receive-pack-advertisement",
			result: "application/x-git-receive-pack-result",
		},
	};

export function contentTypeFor(
	service: GitService,
	phase: "advertise" | "result",
): string {
	return CONTENT_TYPES[service][phase];
}

export function formatAdvertisement(
	service: GitService,
	rawStream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	const serviceLine = `# service=${service}\n`;
	const len = (serviceLine.length + PKT_LINE_LEN_PREFIX)
		.toString(HEX_RADIX)
		.padStart(PKT_LINE_HEADER_WIDTH, "0");
	const header = encoder.encode(len + serviceLine);
	const flush = encoder.encode("0000");

	const reader = rawStream.getReader();
	let phase: "header" | "body" | "done" = "header";

	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			if (phase === "done") {
				controller.close();
				return;
			}

			if (phase === "header") {
				controller.enqueue(header);
				controller.enqueue(flush);
				phase = "body";
				return;
			}

			const { done, value } = await reader.read();
			if (done) {
				controller.close();
				phase = "done";
				return;
			}
			controller.enqueue(value);
		},
		cancel() {
			reader.cancel();
			phase = "done";
		},
	});
}
