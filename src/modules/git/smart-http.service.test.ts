import { describe, expect, it } from "vitest";
import {
	contentTypeFor,
	formatAdvertisement,
	parseSmartHttpPath,
} from "./smart-http.service";

describe("parseSmartHttpPath", () => {
	it("parses repo.git/info/refs with upload-pack service", () => {
		const result = parseSmartHttpPath(
			"default/myrepo.git/info/refs",
			new URLSearchParams("service=git-upload-pack"),
		);
		expect(result.repoName).toBe("myrepo");
		expect(result.organizationName).toBe("default");
		expect(result.endpoint).toBe("info/refs");
		expect(result.service).toBe("git-upload-pack");
	});

	it("parses repo without .git suffix", () => {
		const result = parseSmartHttpPath(
			"default/myrepo/info/refs",
			new URLSearchParams("service=git-upload-pack"),
		);
		expect(result.repoName).toBe("myrepo");
		expect(result.endpoint).toBe("info/refs");
	});

	it("parses git-upload-pack endpoint", () => {
		const result = parseSmartHttpPath(
			"default/myrepo.git/git-upload-pack",
			new URLSearchParams(),
		);
		expect(result.repoName).toBe("myrepo");
		expect(result.endpoint).toBe("git-upload-pack");
		expect(result.service).toBe("git-upload-pack");
	});

	it("parses git-receive-pack endpoint", () => {
		const result = parseSmartHttpPath(
			"default/myrepo.git/git-receive-pack",
			new URLSearchParams(),
		);
		expect(result.repoName).toBe("myrepo");
		expect(result.endpoint).toBe("git-receive-pack");
		expect(result.service).toBe("git-receive-pack");
	});

	it("defaults to git-upload-pack for info/refs without service param", () => {
		const result = parseSmartHttpPath(
			"default/repo.git/info/refs",
			new URLSearchParams(),
		);
		expect(result.service).toBe("git-upload-pack");
	});

	it("recognizes git-receive-pack from query param", () => {
		const result = parseSmartHttpPath(
			"default/repo.git/info/refs",
			new URLSearchParams("service=git-receive-pack"),
		);
		expect(result.service).toBe("git-receive-pack");
	});

	it("returns unknown for unrecognized endpoint", () => {
		const result = parseSmartHttpPath(
			"default/repo.git/unknown/path",
			new URLSearchParams(),
		);
		expect(result.endpoint).toBe("unknown");
	});

	it("returns unknown for short splat", () => {
		const result = parseSmartHttpPath("repo.git", new URLSearchParams());
		expect(result.endpoint).toBe("unknown");
	});

	it("returns unknown for empty splat", () => {
		const result = parseSmartHttpPath("", new URLSearchParams());
		expect(result.endpoint).toBe("unknown");
	});
});

describe("contentTypeFor", () => {
	it("returns upload-pack advertise content type", () => {
		expect(contentTypeFor("git-upload-pack", "advertise")).toBe(
			"application/x-git-upload-pack-advertisement",
		);
	});

	it("returns upload-pack result content type", () => {
		expect(contentTypeFor("git-upload-pack", "result")).toBe(
			"application/x-git-upload-pack-result",
		);
	});

	it("returns receive-pack advertise content type", () => {
		expect(contentTypeFor("git-receive-pack", "advertise")).toBe(
			"application/x-git-receive-pack-advertisement",
		);
	});

	it("returns receive-pack result content type", () => {
		expect(contentTypeFor("git-receive-pack", "result")).toBe(
			"application/x-git-receive-pack-result",
		);
	});
});

describe("formatAdvertisement", () => {
	it("prepends pkt-line header and flush before raw stream", async () => {
		const encoder = new TextEncoder();
		const rawChunks = [encoder.encode("0000")];
		const rawStream = new ReadableStream({
			start(controller) {
				for (const chunk of rawChunks) {
					controller.enqueue(chunk);
				}
				controller.close();
			},
		});

		const formatted = formatAdvertisement("git-upload-pack", rawStream);

		const reader = formatted.getReader();
		const chunks: Uint8Array[] = [];
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		const combined = chunks.map((c) => new TextDecoder().decode(c)).join("");
		expect(combined).toContain("# service=git-upload-pack");
		expect(combined).toContain("0000");
		expect(combined.indexOf("# service=git-upload-pack")).toBeLessThan(
			combined.indexOf("0000"),
		);
	});

	it("works with empty raw stream", async () => {
		const rawStream = new ReadableStream({
			start(controller) {
				controller.close();
			},
		});

		const formatted = formatAdvertisement("git-upload-pack", rawStream);

		const reader = formatted.getReader();
		const chunks: Uint8Array[] = [];
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) chunks.push(value);
		}

		const combined = chunks.map((c) => new TextDecoder().decode(c)).join("");
		expect(combined).toContain("# service=git-upload-pack");
		expect(combined).toContain("0000");
	});
});
