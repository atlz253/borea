import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ForbiddenError, UnauthorizedError } from "#/platform/errors";
import { cleanupAllTestDatabases, createTestDatabase } from "#/test-db";
import { PrismaGitTokenStore } from "./prisma-git-token.store";
import { PrismaUserStore } from "./prisma-user.store";
import { FileAuthProvider, NoAuthProvider } from "./providers";
import type { AuthSession } from "./session";

afterAll(() => {
	cleanupAllTestDatabases();
});

function createSession(): AuthSession & { userId?: string } {
	return {
		async getUserId() {
			return this.userId;
		},
		async setUserId(userId) {
			this.userId = userId;
		},
		async clear() {
			this.userId = undefined;
		},
	};
}

describe("FileAuthProvider", () => {
	it("returns null when no session", async () => {
		const db = createTestDatabase();
		const auth = new FileAuthProvider(
			new PrismaUserStore(db),
			createSession(),
			new PrismaGitTokenStore(db),
		);
		await expect(auth.getCurrentUser()).resolves.toBeNull();
	});

	it("returns null when user not found", async () => {
		const db = createTestDatabase();
		const session = createSession();
		await session.setUserId(randomUUID());
		const auth = new FileAuthProvider(
			new PrismaUserStore(db),
			session,
			new PrismaGitTokenStore(db),
		);
		await expect(auth.getCurrentUser()).resolves.toBeNull();
	});

	it("requires authentication", async () => {
		const db = createTestDatabase();
		const auth = new FileAuthProvider(
			new PrismaUserStore(db),
			createSession(),
			new PrismaGitTokenStore(db),
		);
		await expect(auth.requireCurrentUser()).rejects.toThrow(UnauthorizedError);
	});
});

describe("NoAuthProvider", () => {
	it("always returns the same user", async () => {
		const auth = new NoAuthProvider("testuser");
		const user = await auth.getCurrentUser();
		expect(user).toBeDefined();
		expect(user?.name).toBe("testuser");
		const sameUser = await auth.requireCurrentUser();
		expect(sameUser?.id).toBe(user?.id);
	});

	it("accepts any git token", async () => {
		const auth = new NoAuthProvider("testuser");
		await expect(auth.authenticateGitToken("any-token")).resolves.toBeDefined();
	});

	it("forbids git token management", async () => {
		const auth = new NoAuthProvider("testuser");
		await expect(auth.createGitToken("", "name")).rejects.toThrow(
			ForbiddenError,
		);
		await expect(auth.listGitTokens("")).rejects.toThrow(ForbiddenError);
		await expect(auth.revokeGitToken("", "")).rejects.toThrow(ForbiddenError);
	});

	it("returns user on register and login", async () => {
		const auth = new NoAuthProvider("testuser");
		await expect(
			auth.register({ name: "x", email: "x@x", password: "password" }),
		).resolves.toBeDefined();
		await expect(
			auth.login({ email: "x@x", password: "password" }),
		).resolves.toBeDefined();
	});

	it("finds user by email", async () => {
		const auth = new NoAuthProvider("testuser");
		await expect(
			auth.getUserByEmail("noauth@localhost"),
		).resolves.toBeDefined();
		await expect(auth.getUserByEmail("other@email")).resolves.toBeUndefined();
	});
});
