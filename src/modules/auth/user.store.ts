import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ConflictError } from "#/platform/errors";
import { hashPassword } from "./password";
import {
	type RegisterInput,
	type StoredUser,
	storedUserSchema,
	type User,
} from "./schemas";

export interface UserStore {
	create(input: RegisterInput): Promise<User>;
	getByEmail(email: string): Promise<StoredUser | undefined>;
	getById(id: string): Promise<StoredUser | undefined>;
}

function publicUser(user: StoredUser): User {
	const { credential: _credential, ...result } = user;
	return result;
}

export class FileSystemUserStore implements UserStore {
	private readonly basePath: string;

	constructor(basePath: string) {
		this.basePath = path.resolve(basePath);
	}

	private userPath(email: string): string {
		const fileName = createHash("sha256").update(email).digest("hex");
		return path.join(this.basePath, `${fileName}.json`);
	}

	async create(input: RegisterInput): Promise<User> {
		await mkdir(this.basePath, { recursive: true });
		const user: StoredUser = {
			id: randomUUID(),
			name: input.name,
			email: input.email,
			createdAt: new Date().toISOString(),
			credential: await hashPassword(input.password),
		};
		try {
			await writeFile(
				this.userPath(input.email),
				JSON.stringify(user, null, "\t"),
				{
					encoding: "utf-8",
					flag: "wx",
				},
			);
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "EEXIST"
			) {
				throw new ConflictError("A user with this email already exists");
			}
			throw error;
		}
		return publicUser(user);
	}

	async getByEmail(email: string): Promise<StoredUser | undefined> {
		try {
			return storedUserSchema.parse(
				JSON.parse(await readFile(this.userPath(email), "utf-8")),
			);
		} catch {
			return undefined;
		}
	}

	async getById(id: string): Promise<StoredUser | undefined> {
		await mkdir(this.basePath, { recursive: true });
		const files = await readdir(this.basePath, { withFileTypes: true });
		for (const file of files) {
			if (!file.isFile() || !file.name.endsWith(".json")) {
				continue;
			}
			try {
				const user = storedUserSchema.parse(
					JSON.parse(
						await readFile(path.join(this.basePath, file.name), "utf-8"),
					),
				);
				if (user.id === id) {
					return user;
				}
			} catch {}
		}
		return undefined;
	}
}
