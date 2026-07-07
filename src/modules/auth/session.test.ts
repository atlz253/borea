import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "#/platform/errors";
import { assertSameOriginRequest, cookieAuthSession } from "./session";

vi.mock("@tanstack/react-start/server", () => ({
	getRequest: vi.fn(),
	useSession: vi.fn(),
}));

vi.mock("#/platform/config", () => ({
	getConfig: vi.fn().mockReturnValue({
		sessionSecret: "test-secret-key-that-is-at-least-32-chars-long",
		sessionCookieSecure: false,
	}),
}));

const { getRequest } = await import("@tanstack/react-start/server");
const { useSession } = await import("@tanstack/react-start/server");

function createMockSession(data: { userId?: string } = {}) {
	return {
		id: "test-session-id",
		data,
		update: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn().mockResolvedValue(undefined),
	};
}

describe("session", () => {
	describe("assertSameOriginRequest", () => {
		it("does not throw when origin header is missing", () => {
			vi.mocked(getRequest).mockReturnValue({
				headers: new Headers(),
				url: "http://localhost:3000/path",
			} as Request);

			expect(() => assertSameOriginRequest()).not.toThrow();
		});

		it("does not throw when origin matches request origin", () => {
			vi.mocked(getRequest).mockReturnValue({
				headers: new Headers({ origin: "http://localhost:3000" }),
				url: "http://localhost:3000/path",
			} as Request);

			expect(() => assertSameOriginRequest()).not.toThrow();
		});

		it("throws UnauthorizedError when origin does not match request origin", () => {
			vi.mocked(getRequest).mockReturnValue({
				headers: new Headers({ origin: "http://evil.com" }),
				url: "http://localhost:3000/path",
			} as Request);

			expect(() => assertSameOriginRequest()).toThrow(UnauthorizedError);
			expect(() => assertSameOriginRequest()).toThrow(
				"Cross-origin request rejected",
			);
		});

		it("throws UnauthorizedError for different port", () => {
			vi.mocked(getRequest).mockReturnValue({
				headers: new Headers({ origin: "http://localhost:8080" }),
				url: "http://localhost:3000/path",
			} as Request);

			expect(() => assertSameOriginRequest()).toThrow(UnauthorizedError);
		});

		it("throws UnauthorizedError for different protocol", () => {
			vi.mocked(getRequest).mockReturnValue({
				headers: new Headers({ origin: "https://localhost:3000" }),
				url: "http://localhost:3000/path",
			} as Request);

			expect(() => assertSameOriginRequest()).toThrow(UnauthorizedError);
		});

		it("handles complex URLs with paths and query strings", () => {
			vi.mocked(getRequest).mockReturnValue({
				headers: new Headers({ origin: "http://localhost:3000" }),
				url: "http://localhost:3000/api/v1/repositories?org=test",
			} as Request);

			expect(() => assertSameOriginRequest()).not.toThrow();
		});
	});

	describe("cookieAuthSession", () => {
		it("returns userId from session data", async () => {
			const mockSession = createMockSession({ userId: "user-123" });
			vi.mocked(useSession).mockResolvedValue(mockSession);

			const userId = await cookieAuthSession.getUserId();

			expect(userId).toBe("user-123");
		});

		it("returns undefined when userId is not set", async () => {
			const mockSession = createMockSession();
			vi.mocked(useSession).mockResolvedValue(mockSession);

			const userId = await cookieAuthSession.getUserId();

			expect(userId).toBeUndefined();
		});

		it("sets userId in session", async () => {
			const mockSession = createMockSession();
			vi.mocked(useSession).mockResolvedValue(mockSession);

			await cookieAuthSession.setUserId("user-456");

			expect(mockSession.update).toHaveBeenCalledWith({ userId: "user-456" });
		});

		it("clears session", async () => {
			const mockSession = createMockSession({ userId: "user-789" });
			vi.mocked(useSession).mockResolvedValue(mockSession);

			await cookieAuthSession.clear();

			expect(mockSession.clear).toHaveBeenCalledOnce();
		});

		it("calls getServerSession with correct configuration", async () => {
			const mockSession = createMockSession();
			vi.mocked(useSession).mockResolvedValue(mockSession);

			await cookieAuthSession.getUserId();

			expect(useSession).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "borea-session",
					maxAge: 604800,
					cookie: expect.objectContaining({
						httpOnly: true,
						sameSite: "lax",
						path: "/",
						secure: false,
					}),
				}),
			);
		});

		it("drives cookie.secure from config.sessionCookieSecure", async () => {
			const { getConfig } = await import("#/platform/config");
			vi.mocked(getConfig).mockReturnValue({
				sessionSecret: "test-secret-key-that-is-at-least-32-chars-long",
				sessionCookieSecure: true,
			} as ReturnType<typeof getConfig>);

			const mockSession = createMockSession();
			vi.mocked(useSession).mockResolvedValue(mockSession);

			await cookieAuthSession.getUserId();

			expect(useSession).toHaveBeenCalledWith(
				expect.objectContaining({
					cookie: expect.objectContaining({
						secure: true,
					}),
				}),
			);
		});

		it("handles session operations sequentially", async () => {
			let sessionData = { userId: undefined as string | undefined };
			const mockSession = createMockSession(sessionData);
			vi.mocked(useSession).mockImplementation(() => {
				return Promise.resolve({
					...mockSession,
					data: { ...sessionData },
				});
			});

			await cookieAuthSession.setUserId("user-111");
			sessionData = { userId: "user-111" };
			const userId = await cookieAuthSession.getUserId();
			await cookieAuthSession.clear();
			sessionData = { userId: undefined };
			const userIdAfterClear = await cookieAuthSession.getUserId();

			expect(userId).toBe("user-111");
			expect(userIdAfterClear).toBeUndefined();
		});
	});
});
