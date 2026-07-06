import { Readable, Writable } from "node:stream";
import { execa } from "execa";
import { afterEach, describe, expect, it, vi } from "vitest";
import { advertiseRefs, invokeService } from "./cli-git-transport";

vi.mock("execa", () => ({
	execa: vi.fn(),
}));

const mockExeca = vi.mocked(execa);

interface MockSubprocess {
	stdout: Readable;
	stdin: Writable;
}

function createMockSubprocess(options?: {
	stdoutData?: Buffer;
	reject?: boolean;
}): MockSubprocess & Promise<void> {
	const stdout = new Readable({ read() {} });
	const stdin = new Writable({
		write(_chunk, _encoding, callback) {
			callback();
		},
	});

	if (options?.stdoutData) {
		stdout.push(options.stdoutData);
		stdout.push(null);
	}

	let p: Promise<void>;
	if (options?.reject) {
		p = Promise.reject(new Error("simulated error"));
	} else {
		p = Promise.resolve();
	}

	return Object.assign(p, { stdout, stdin });
}

function makeInput(data?: Uint8Array): ReadableStream<Uint8Array> {
	return new ReadableStream<Uint8Array>({
		start(controller) {
			if (data) {
				controller.enqueue(data);
			}
			controller.close();
		},
	});
}

function readAll(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
	const reader = stream.getReader();
	const chunks: Buffer[] = [];
	return new Promise<Buffer>((resolve, reject) => {
		const pump = () => {
			reader
				.read()
				.then(({ done, value }) => {
					if (done) {
						resolve(Buffer.concat(chunks));
					} else if (value) {
						chunks.push(Buffer.from(value));
						pump();
					}
				})
				.catch(reject);
		};
		pump();
	});
}

describe("advertiseRefs", () => {
	afterEach(() => {
		mockExeca.mockReset();
	});

	it("invokes git with upload-pack service and --advertise-refs flag", () => {
		mockExeca.mockReturnValue(
			createMockSubprocess() as unknown as ReturnType<typeof execa>,
		);

		advertiseRefs("/usr/bin/git", "/path/to/repo.git", "git-upload-pack");

		expect(mockExeca).toHaveBeenCalledWith("/usr/bin/git", [
			"--git-dir",
			"/path/to/repo.git",
			"upload-pack",
			"--stateless-rpc",
			"--advertise-refs",
			"/path/to/repo.git",
		]);
	});

	it("invokes git with receive-pack service", () => {
		mockExeca.mockReturnValue(
			createMockSubprocess() as unknown as ReturnType<typeof execa>,
		);

		advertiseRefs("/usr/bin/git", "/path/to/repo.git", "git-receive-pack");

		expect(mockExeca).toHaveBeenCalledWith("/usr/bin/git", [
			"--git-dir",
			"/path/to/repo.git",
			"receive-pack",
			"--stateless-rpc",
			"--advertise-refs",
			"/path/to/repo.git",
		]);
	});

	it("returns the subprocess stdout as a ReadableStream", async () => {
		const data = Buffer.from("000f# service=git-upload-pack\0", "utf-8");
		const subprocess = createMockSubprocess({ stdoutData: data });
		mockExeca.mockReturnValue(
			subprocess as unknown as ReturnType<typeof execa>,
		);

		const stream = advertiseRefs(
			"/usr/bin/git",
			"/path/to/repo.git",
			"git-upload-pack",
		);

		expect(stream).toBeInstanceOf(ReadableStream);

		const result = await readAll(stream);
		expect(result).toEqual(data);
	});

	it("returns a ReadableStream when subprocess has no output", () => {
		const subprocess = createMockSubprocess();
		mockExeca.mockReturnValue(
			subprocess as unknown as ReturnType<typeof execa>,
		);

		const stream = advertiseRefs(
			"/usr/bin/git",
			"/path/to/repo.git",
			"git-upload-pack",
		);

		expect(stream).toBeInstanceOf(ReadableStream);
	});

	it("passes the correct git binary path", () => {
		mockExeca.mockReturnValue(
			createMockSubprocess() as unknown as ReturnType<typeof execa>,
		);

		advertiseRefs("/custom/bin/git", "/repo", "git-upload-pack");

		expect(mockExeca).toHaveBeenCalledWith(
			"/custom/bin/git",
			expect.any(Array),
		);
	});

	it("passes the correct repository path", () => {
		mockExeca.mockReturnValue(
			createMockSubprocess() as unknown as ReturnType<typeof execa>,
		);

		advertiseRefs("/usr/bin/git", "/var/git/bare/repo.git", "git-receive-pack");

		expect(mockExeca).toHaveBeenCalledWith(
			"/usr/bin/git",
			expect.arrayContaining(["/var/git/bare/repo.git"]),
		);
	});
});

describe("invokeService", () => {
	afterEach(() => {
		mockExeca.mockReset();
	});

	it("invokes git without --advertise-refs flag", () => {
		mockExeca.mockReturnValue(
			createMockSubprocess() as unknown as ReturnType<typeof execa>,
		);
		const input = makeInput();

		invokeService(
			"/usr/bin/git",
			"/path/to/repo.git",
			"git-upload-pack",
			input,
		);

		expect(mockExeca).toHaveBeenCalledWith("/usr/bin/git", [
			"--git-dir",
			"/path/to/repo.git",
			"upload-pack",
			"--stateless-rpc",
			"/path/to/repo.git",
		]);
	});

	it("invokes git with receive-pack service", () => {
		mockExeca.mockReturnValue(
			createMockSubprocess() as unknown as ReturnType<typeof execa>,
		);
		const input = makeInput();

		invokeService(
			"/usr/bin/git",
			"/path/to/repo.git",
			"git-receive-pack",
			input,
		);

		expect(mockExeca).toHaveBeenCalledWith("/usr/bin/git", [
			"--git-dir",
			"/path/to/repo.git",
			"receive-pack",
			"--stateless-rpc",
			"/path/to/repo.git",
		]);
	});

	it("returns the subprocess stdout as a ReadableStream", async () => {
		const data = Buffer.from("upload-pack result data", "utf-8");
		const stdin = new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			},
		});
		const stdout = new Readable({ read() {} });
		stdout.push(data);
		stdout.push(null);
		const subprocess = Object.assign(Promise.resolve(), { stdout, stdin });
		mockExeca.mockReturnValue(
			subprocess as unknown as ReturnType<typeof execa>,
		);

		const input = makeInput();
		const stream = invokeService(
			"/usr/bin/git",
			"/path/to/repo.git",
			"git-upload-pack",
			input,
		);

		expect(stream).toBeInstanceOf(ReadableStream);

		const result = await readAll(stream);
		expect(result).toEqual(data);
	});

	it("pipes input data to subprocess stdin", async () => {
		const writtenChunks: Buffer[] = [];
		const stdin = new Writable({
			write(chunk, _encoding, callback) {
				writtenChunks.push(Buffer.from(chunk));
				callback();
			},
		});
		const stdout = new Readable({ read() {} });
		const subprocess = Object.assign(Promise.resolve(), { stdout, stdin });
		mockExeca.mockReturnValue(
			subprocess as unknown as ReturnType<typeof execa>,
		);

		const inputData = Buffer.from("pack-data-payload", "utf-8");
		const input = makeInput(new Uint8Array(inputData));

		invokeService(
			"/usr/bin/git",
			"/path/to/repo.git",
			"git-upload-pack",
			input,
		);

		// Wait for the async pipe to complete
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(writtenChunks.length).toBeGreaterThan(0);
		const combined = Buffer.concat(writtenChunks);
		expect(combined).toEqual(inputData);
	});

	it("handles empty input stream", async () => {
		const stdin = new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			},
		});
		const stdout = new Readable({ read() {} });
		const subprocess = Object.assign(Promise.resolve(), { stdout, stdin });
		mockExeca.mockReturnValue(
			subprocess as unknown as ReturnType<typeof execa>,
		);

		const input = makeInput();

		expect(() => {
			invokeService(
				"/usr/bin/git",
				"/path/to/repo.git",
				"git-upload-pack",
				input,
			);
		}).not.toThrow();
	});

	it("suppresses subprocess rejections via .catch()", async () => {
		const handler = vi.fn();
		const p = Promise.reject(new Error("test"));
		p.catch(handler);

		// Allow microtask to process
		await Promise.resolve();

		expect(handler).toHaveBeenCalledOnce();
		expect(handler).toHaveBeenCalledWith(new Error("test"));
	});

	it("handles subprocess rejection without throwing", async () => {
		const subprocess = createMockSubprocess({ reject: true });
		mockExeca.mockReturnValue(
			subprocess as unknown as ReturnType<typeof execa>,
		);

		const input = makeInput();

		expect(() => {
			invokeService(
				"/usr/bin/git",
				"/path/to/repo.git",
				"git-upload-pack",
				input,
			);
		}).not.toThrow();
	});

	it("handles multi-chunk input", async () => {
		const writtenChunks: Buffer[] = [];
		const stdin = new Writable({
			write(chunk, _encoding, callback) {
				writtenChunks.push(Buffer.from(chunk));
				callback();
			},
		});
		const stdout = new Readable({ read() {} });
		const subprocess = Object.assign(Promise.resolve(), { stdout, stdin });
		mockExeca.mockReturnValue(
			subprocess as unknown as ReturnType<typeof execa>,
		);

		const encoder = new TextEncoder();
		const input = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(encoder.encode("chunk-1"));
				controller.enqueue(encoder.encode("chunk-2"));
				controller.enqueue(encoder.encode("chunk-3"));
				controller.close();
			},
		});

		invokeService(
			"/usr/bin/git",
			"/path/to/repo.git",
			"git-upload-pack",
			input,
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const combined = Buffer.concat(writtenChunks);
		expect(combined.toString()).toBe("chunk-1chunk-2chunk-3");
	});
});
