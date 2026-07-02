import { afterEach, describe, expect, it } from "vitest";
import { getConfig, resetConfigForTests } from "./index";

const originalEnvironment = { ...process.env };

afterEach(() => {
	process.env = { ...originalEnvironment };
	resetConfigForTests();
});

describe("authentication configuration", () => {
	it("uses full authentication by default and requires a session secret", () => {
		delete process.env.AUTH_MODE;
		delete process.env.SESSION_SECRET;
		process.env.ORGANIZATION_MODE = "multi";
		resetConfigForTests();

		expect(() => getConfig()).toThrow(/SESSION_SECRET/);
	});

	it("accepts full mode with a sufficiently long secret", () => {
		process.env.AUTH_MODE = "full";
		process.env.ORGANIZATION_MODE = "multi";
		process.env.SESSION_SECRET = "a".repeat(32);
		resetConfigForTests();

		expect(getConfig().authMode).toBe("full");
	});

	it("rejects full authentication with single organization mode", () => {
		process.env.AUTH_MODE = "full";
		process.env.ORGANIZATION_MODE = "single";
		process.env.SESSION_SECRET = "a".repeat(32);
		resetConfigForTests();

		expect(() => getConfig()).toThrow(/only supported/);
	});

	it("blocks NoAuth in production without the explicit override", () => {
		process.env.AUTH_MODE = "noauth";
		process.env.NODE_ENV = "production";
		delete process.env.ALLOW_NOAUTH_IN_PRODUCTION;
		resetConfigForTests();

		expect(() => getConfig()).toThrow(/prohibited/);
	});
});
