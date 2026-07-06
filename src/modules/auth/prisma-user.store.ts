import { randomUUID } from "node:crypto";
import type { DatabaseProvider } from "#/platform/database";
import { ConflictError } from "#/platform/errors";
import { hashPassword } from "./password";
import type {
	PasswordCredential,
	RegisterInput,
	StoredUser,
	User,
} from "./schemas";
import type { UserStore } from "./user.store";

function parseCredential(credential: string): PasswordCredential {
	try {
		return JSON.parse(credential) as PasswordCredential;
	} catch {
		throw new Error("Invalid credential format in database");
	}
}

function toStoredUser(row: {
	id: string;
	name: string;
	email: string;
	createdAt: string;
	credential: string;
}): StoredUser {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		createdAt: row.createdAt,
		credential: parseCredential(row.credential),
	};
}

export class PrismaUserStore implements UserStore {
	constructor(private readonly db: DatabaseProvider) {}

	async create(input: RegisterInput): Promise<User> {
		const client = this.db.getClient();
		const id = randomUUID();
		const createdAt = new Date().toISOString();
		const credentialValue = JSON.stringify(await hashPassword(input.password));
		try {
			await client.user.create({
				data: {
					id,
					name: input.name,
					email: input.email,
					createdAt,
					credential: credentialValue,
				},
			});
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "P2002"
			) {
				throw new ConflictError("A user with this email already exists");
			}
			throw error;
		}
		return { id, name: input.name, email: input.email, createdAt };
	}

	async getByEmail(email: string): Promise<StoredUser | undefined> {
		const row = await this.db.getClient().user.findUnique({
			where: { email },
		});
		if (!row) return undefined;
		return toStoredUser(row);
	}

	async getById(id: string): Promise<StoredUser | undefined> {
		const row = await this.db.getClient().user.findUnique({
			where: { id },
		});
		if (!row) return undefined;
		return toStoredUser(row);
	}
}
