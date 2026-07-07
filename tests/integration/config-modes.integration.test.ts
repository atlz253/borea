import { afterEach, describe, expect, it } from "vitest";
import { getConfig, resetConfigForTests } from "#/platform/config";

const originalEnv = { ...process.env };

afterEach(() => {
	process.env = { ...originalEnv };
	resetConfigForTests();
});

describe("configuration mode wiring", () => {
	it("defaults to full auth mode", () => {
		delete process.env.AUTH_MODE;
		delete process.env.SESSION_SECRET;
		resetConfigForTests();

		expect(() => getConfig()).toThrow(/SESSION_SECRET/);
	});

	it("reads AUTH_MODE=noauth", () => {
		process.env.AUTH_MODE = "noauth";
		resetConfigForTests();

		const config = getConfig();
		expect(config.authMode).toBe("noauth");
	});

	it("blocks noauth in production without override", () => {
		process.env.AUTH_MODE = "noauth";
		process.env.NODE_ENV = "production";
		resetConfigForTests();

		expect(() => getConfig()).toThrow();
	});

	it("allows noauth in production with ALLOW_NOAUTH_IN_PRODUCTION=true", () => {
		process.env.AUTH_MODE = "noauth";
		process.env.NODE_ENV = "production";
		process.env.ALLOW_NOAUTH_IN_PRODUCTION = "true";
		resetConfigForTests();

		const config = getConfig();
		expect(config.authMode).toBe("noauth");
	});

	it("reads storage path from REPOSITORIES_PATH", () => {
		process.env.AUTH_MODE = "noauth";
		process.env.REPOSITORIES_PATH = "/custom/repos";
		resetConfigForTests();

		const config = getConfig();
		expect(config.storagePath).toBe("/custom/repos");
	});

	it("reads ORGANIZATION_MODE=single", () => {
		process.env.AUTH_MODE = "noauth";
		process.env.ORGANIZATION_MODE = "single";
		resetConfigForTests();

		const config = getConfig();
		expect(config.organizationMode).toBe("single");
	});

	it("reads ORGANIZATION_MODE=multi", () => {
		process.env.AUTH_MODE = "noauth";
		process.env.ORGANIZATION_MODE = "multi";
		resetConfigForTests();

		const config = getConfig();
		expect(config.organizationMode).toBe("multi");
	});

	describe("sessionCookieSecure", () => {
		it("defaults to false in development (NODE_ENV undefined)", () => {
			process.env.AUTH_MODE = "full";
			process.env.ORGANIZATION_MODE = "multi";
			process.env.SESSION_SECRET = "a".repeat(32);
			delete process.env.SESSION_COOKIE_SECURE;
			resetConfigForTests();

			expect(getConfig().sessionCookieSecure).toBe(false);
		});

		it("defaults to true in production", () => {
			process.env.AUTH_MODE = "full";
			process.env.ORGANIZATION_MODE = "multi";
			process.env.SESSION_SECRET = "a".repeat(32);
			process.env.NODE_ENV = "production";
			delete process.env.SESSION_COOKIE_SECURE;
			resetConfigForTests();

			expect(getConfig().sessionCookieSecure).toBe(true);
		});

		it("respects explicit false override", () => {
			process.env.AUTH_MODE = "full";
			process.env.ORGANIZATION_MODE = "multi";
			process.env.SESSION_SECRET = "a".repeat(32);
			process.env.NODE_ENV = "production";
			process.env.SESSION_COOKIE_SECURE = "false";
			resetConfigForTests();

			expect(getConfig().sessionCookieSecure).toBe(false);
		});
	});
});
