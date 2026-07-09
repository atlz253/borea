import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createAppLogger } from "./index";

class MemoryLogStream extends Writable {
	readonly chunks: string[] = [];

	override _write(
		chunk: Buffer,
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void,
	): void {
		this.chunks.push(chunk.toString("utf8"));
		callback();
	}
}

function createMemoryLogger(logLevel = "debug") {
	const destination = new MemoryLogStream();
	const logger = createAppLogger({
		destination,
		environment: "production",
		logFormat: "json",
		logLevel,
		serviceName: "borea-test",
	});
	return { destination, logger };
}

describe("logger", () => {
	it("writes structured JSON logs", () => {
		const { destination, logger } = createMemoryLogger();

		logger.info({ requestId: "req-1" }, "request.finish");

		const entry = JSON.parse(destination.chunks[0] ?? "{}");
		expect(entry).toMatchObject({
			environment: "production",
			level: 30,
			msg: "request.finish",
			requestId: "req-1",
			service: "borea-test",
		});
		expect(typeof entry.time).toBe("string");
	});

	it("redacts sensitive fields", () => {
		const { destination, logger } = createMemoryLogger();

		logger.info(
			{
				headers: {
					authorization: "Basic secret",
					cookie: "session=secret",
				},
				password: "secret",
				token: "secret",
			},
			"auth.event",
		);

		const entry = JSON.parse(destination.chunks[0] ?? "{}");
		expect(entry.headers.authorization).toBe("[Redacted]");
		expect(entry.headers.cookie).toBe("[Redacted]");
		expect(entry.password).toBe("[Redacted]");
		expect(entry.token).toBe("[Redacted]");
	});

	it("honors log level", () => {
		const { destination, logger } = createMemoryLogger("warn");

		logger.info("hidden");
		logger.warn("visible");

		expect(destination.chunks).toHaveLength(1);
		expect(JSON.parse(destination.chunks[0] ?? "{}").msg).toBe("visible");
	});
});
