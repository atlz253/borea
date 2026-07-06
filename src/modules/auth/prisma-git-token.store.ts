import {
	createHash,
	randomBytes,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import type { DatabaseProvider } from "#/platform/database";
import type { GitTokenStore } from "./git-token.store";
import {
	type CreatedGitToken,
	type GitToken,
	gitTokenIdSchema,
} from "./schemas";

const TOKEN_PREFIX = "nirvana";
const SECRET_BYTES = 32;
const BASE64URL_SECRET_LENGTH = 43;

function hashSecret(secret: string): string {
	return createHash("sha256").update(secret).digest("hex");
}

export class PrismaGitTokenStore implements GitTokenStore {
	constructor(private readonly db: DatabaseProvider) {}

	async create(userId: string, name: string): Promise<CreatedGitToken> {
		const id = randomUUID();
		const secret = randomBytes(SECRET_BYTES).toString("base64url");
		const token = `${TOKEN_PREFIX}_${id}_${secret}`;
		await this.db.getClient().gitToken.create({
			data: {
				id,
				userId,
				name,
				createdAt: new Date().toISOString(),
				secretHash: hashSecret(secret),
			},
		});
		return { id, name, createdAt: new Date().toISOString(), token };
	}

	async list(userId: string): Promise<GitToken[]> {
		const rows = await this.db.getClient().gitToken.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			select: { id: true, name: true, createdAt: true },
		});
		return rows;
	}

	async revoke(userId: string, tokenId: string): Promise<void> {
		await this.db.getClient().gitToken.deleteMany({
			where: { id: tokenId, userId },
		});
	}

	async verify(token: string): Promise<string | undefined> {
		const prefixSeparator = token.indexOf("_");
		const idSeparator = token.indexOf("_", prefixSeparator + 1);
		const prefix = token.slice(0, prefixSeparator);
		const id = token.slice(prefixSeparator + 1, idSeparator);
		const secret = token.slice(idSeparator + 1);
		if (prefix !== TOKEN_PREFIX || secret.length !== BASE64URL_SECRET_LENGTH) {
			return undefined;
		}
		if (!gitTokenIdSchema.safeParse(id).success) {
			return undefined;
		}
		const stored = await this.db.getClient().gitToken.findUnique({
			where: { id },
		});
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
