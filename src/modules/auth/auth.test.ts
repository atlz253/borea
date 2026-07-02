import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConflictError, UnauthorizedError } from "#/platform/errors";
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
		const { store } = await createStore();
		const session = createSession();
		const provider = new FileAuthProvider(store, session);
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
		const { store } = await createStore();
		const provider = new FileAuthProvider(store, createSession());
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
	});
});
