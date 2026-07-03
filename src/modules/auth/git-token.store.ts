import {
	createHash,
	randomBytes,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
	CreatedGitToken,
	GitToken,
	StoredGitToken,
} from "./schemas";
import { gitTokenIdSchema, storedGitTokenSchema } from "./schemas";

const TOKEN_PREFIX = "nirvana";
const SECRET_BYTES = 32;
const JSON_EXTENSION_LENGTH = 5;
const BASE64URL_SECRET_LENGTH = 43;

export interface GitTokenStore {
	create(userId: string, name: string): Promise<CreatedGitToken>;
	list(userId: string): Promise<GitToken[]>;
	revoke(userId: string, tokenId: string): Promise<void>;
	verify(token: string): Promise<string | undefined>;
}

function hashSecret(secret: string): string {
	return createHash("sha256").update(secret).digest("hex");
}

function publicToken(token: StoredGitToken): GitToken {
	return {
		id: token.id,
		name: token.name,
		createdAt: token.createdAt,
	};
}

export class FileSystemGitTokenStore implements GitTokenStore {
	private readonly basePath: string;

	constructor(usersPath: string) {
		this.basePath = path.resolve(usersPath, "git-tokens");
	}

	private tokenPath(tokenId: string): string {
		return path.join(this.basePath, `${tokenId}.json`);
	}

	private async read(tokenId: string): Promise<StoredGitToken | undefined> {
		try {
			return storedGitTokenSchema.parse(
				JSON.parse(await readFile(this.tokenPath(tokenId), "utf-8")),
			);
		} catch {
			return undefined;
		}
	}

	async create(userId: string, name: string): Promise<CreatedGitToken> {
		await mkdir(this.basePath, { recursive: true });
		const id = randomUUID();
		const secret = randomBytes(SECRET_BYTES).toString("base64url");
		const token = `${TOKEN_PREFIX}_${id}_${secret}`;
		const stored: StoredGitToken = {
			id,
			userId,
			name,
			createdAt: new Date().toISOString(),
			secretHash: hashSecret(secret),
		};
		await writeFile(this.tokenPath(id), JSON.stringify(stored, null, "\t"), {
			encoding: "utf-8",
			flag: "wx",
		});
		return { ...publicToken(stored), token };
	}

	async list(userId: string): Promise<GitToken[]> {
		await mkdir(this.basePath, { recursive: true });
		const entries = await readdir(this.basePath, { withFileTypes: true });
		const tokens = await Promise.all(
			entries
				.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
				.map((entry) =>
					this.read(entry.name.slice(0, -JSON_EXTENSION_LENGTH)),
				),
		);
		return tokens
			.filter(
				(token): token is StoredGitToken =>
					token !== undefined && token.userId === userId,
			)
			.map(publicToken)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	}

	async revoke(userId: string, tokenId: string): Promise<void> {
		const token = await this.read(tokenId);
		if (!token || token.userId !== userId) {
			return;
		}
		await unlink(this.tokenPath(tokenId));
	}

	async verify(token: string): Promise<string | undefined> {
		const prefixSeparator = token.indexOf("_");
		const idSeparator = token.indexOf("_", prefixSeparator + 1);
		const prefix = token.slice(0, prefixSeparator);
		const id = token.slice(prefixSeparator + 1, idSeparator);
		const secret = token.slice(idSeparator + 1);
		if (
			prefix !== TOKEN_PREFIX ||
			!gitTokenIdSchema.safeParse(id).success ||
			secret.length !== BASE64URL_SECRET_LENGTH
		) {
			return undefined;
		}
		const stored = await this.read(id);
		if (!stored) {
			return undefined;
		}
		const expected = Buffer.from(stored.secretHash, "hex");
		const actual = Buffer.from(hashSecret(secret), "hex");
		return expected.length === actual.length &&
			timingSafeEqual(expected, actual)
			? stored.userId
			: undefined;
	}
}
