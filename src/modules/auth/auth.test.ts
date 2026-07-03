import { createHash, randomUUID } from "node:crypto";
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	ConflictError,
	ForbiddenError,
	UnauthorizedError,
} from "#/platform/errors";
import { FileSystemGitTokenStore } from "./git-token.store";
import { FileAuthProvider, NoAuthProvider } from "./providers";
import { registerSchema } from "./schemas";
import type { AuthSession } from "./session";
import { FileSystemUserStore } from "./user.store";

const directories: string[] = [];

async function createStore(): Promise<{
	directory: string;
	store: FileSystemUserStore;
}> {
	const directory = await mkdtemp(path.join(tmpdir(), "nirvana-users-"));
	directories.push(directory);
	return { directory, store: new FileSystemUserStore(directory) };
}

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

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("file authentication", () => {
	it("normalizes registration data and enforces the password length", () => {
		expect(
			registerSchema.parse({
				name: " Alice ",
				email: "Alice@Example.COM",
				password: "password",
			}),
		).toMatchObject({ name: "Alice", email: "alice@example.com" });
		expect(() =>
			registerSchema.parse({
				name: "Alice",
				email: "alice@example.com",
				password: "short",
			}),
		).toThrow();
	});

	it("registers, logs in, and logs out without exposing credentials", async () => {
		const { directory, store } = await createStore();
		const session = createSession();
		const provider = new FileAuthProvider(
			store,
			session,
			new FileSystemGitTokenStore(directory),
		);
		const input = {
			name: "Alice",
			email: "alice@example.com",
			password: "password",
		};

		const registered = await provider.register(input);
		expect(registered).not.toHaveProperty("credential");
		await expect(provider.getUserByEmail(input.email)).resolves.toEqual(
			registered,
		);
		await expect(provider.getUserById(registered.id)).resolves.toEqual(
			registered,
		);
		await provider.logout();
		await expect(provider.getCurrentUser()).resolves.toBeNull();

		const loggedIn = await provider.login(input);
		expect(loggedIn.id).toBe(registered.id);
		await expect(provider.requireCurrentUser()).resolves.toMatchObject({
			email: input.email,
		});
	});

	it("rejects duplicates and invalid credentials", async () => {
		const { directory, store } = await createStore();
		const provider = new FileAuthProvider(
			store,
			createSession(),
			new FileSystemGitTokenStore(directory),
		);
		const input = {
			name: "Alice",
			email: "alice@example.com",
			password: "password",
		};
		await provider.register(input);

		await expect(provider.register(input)).rejects.toBeInstanceOf(
			ConflictError,
		);
		await expect(
			provider.login({ ...input, password: "incorrect" }),
		).rejects.toBeInstanceOf(UnauthorizedError);
	});

	it("creates, isolates, verifies, and revokes Git tokens", async () => {
		const { directory, store } = await createStore();
		const provider = new FileAuthProvider(
			store,
			createSession(),
			new FileSystemGitTokenStore(directory),
		);
		const alice = await provider.register({
			name: "Alice",
			email: "alice@example.com",
			password: "password",
		});
		const bob = await provider.register({
			name: "Bob",
			email: "bob@example.com",
			password: "password",
		});

		const aliceToken = await provider.createGitToken(alice.id, "Laptop");
		const bobToken = await provider.createGitToken(bob.id, "Desktop");
		expect(aliceToken.token).toMatch(
			/^nirvana_[0-9a-f-]{36}_[A-Za-z0-9_-]{43}$/,
		);
		await expect(provider.listGitTokens(alice.id)).resolves.toEqual([
			expect.objectContaining({ id: aliceToken.id, name: "Laptop" }),
		]);
		await expect(provider.listGitTokens(bob.id)).resolves.toEqual([
			expect.objectContaining({ id: bobToken.id, name: "Desktop" }),
		]);
		await expect(
			provider.authenticateGitToken(aliceToken.token),
		).resolves.toMatchObject({ id: alice.id });
		await expect(
			provider.authenticateGitToken(`${aliceToken.token}invalid`),
		).resolves.toBeNull();

		const tokenFiles = await readdir(path.join(directory, "git-tokens"));
		const stored = await readFile(
			path.join(directory, "git-tokens", tokenFiles[0]),
			"utf-8",
		);
		expect(stored).not.toContain(aliceToken.token);
		expect(stored).not.toContain(aliceToken.token.split("_").at(-1));

		await provider.revokeGitToken(bob.id, aliceToken.id);
		await expect(
			provider.authenticateGitToken(aliceToken.token),
		).resolves.toMatchObject({ id: alice.id });
		await provider.revokeGitToken(alice.id, aliceToken.id);
		await expect(
			provider.authenticateGitToken(aliceToken.token),
		).resolves.toBeNull();
	});

	it("verifies Git token secrets containing underscores", async () => {
		const { directory } = await createStore();
		const tokenDirectory = path.join(directory, "git-tokens");
		await mkdir(tokenDirectory);
		const id = randomUUID();
		const userId = randomUUID();
		const secret = `_${"a".repeat(42)}`;
		await writeFile(
			path.join(tokenDirectory, `${id}.json`),
			JSON.stringify({
				id,
				userId,
				name: "Underscore token",
				createdAt: new Date().toISOString(),
				secretHash: createHash("sha256").update(secret).digest("hex"),
			}),
			"utf-8",
		);
		const store = new FileSystemGitTokenStore(directory);

		await expect(store.verify(`nirvana_${id}_${secret}`)).resolves.toBe(userId);
	});

	it("ignores corrupt user files", async () => {
		const { directory, store } = await createStore();
		await writeFile(path.join(directory, "broken.json"), "{", "utf-8");

		await expect(store.getById("missing")).resolves.toBeUndefined();
		await expect(
			store.getByEmail("missing@example.com"),
		).resolves.toBeUndefined();
	});
});

describe("NoAuthProvider", () => {
	it("always returns the fixed user", async () => {
		const provider = new NoAuthProvider("developer");

		await expect(provider.getCurrentUser()).resolves.toMatchObject({
			name: "developer",
		});
		await expect(provider.requireCurrentUser()).resolves.toMatchObject({
			name: "developer",
		});
		await expect(
			provider.createGitToken(
				"00000000-0000-4000-8000-000000000000",
				"Laptop",
			),
		).rejects.toBeInstanceOf(ForbiddenError);
	});
});
