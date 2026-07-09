import type { Config } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import {
	type PrismaClient,
	PrismaClient as PrismaClientClass,
} from "#/generated/prisma/client";
import { getConfig } from "#/platform/config";
import { ensureFileDatabaseDir } from "#/platform/paths";
import type { DatabaseProvider } from "./database-provider";

type TxClient = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

type PrismaClientOptions = ConstructorParameters<typeof PrismaClientClass>[0];
type PrismaAdapter = Exclude<
	NonNullable<PrismaClientOptions>["adapter"],
	undefined
>;

function createAdapter(url: string): PrismaAdapter {
	if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
		return new PrismaPg({ connectionString: url }) as PrismaAdapter;
	}

	if (
		url.startsWith("file:") ||
		url.startsWith("libsql://") ||
		url === ":memory:"
	) {
		return new PrismaLibSql({ url } satisfies Config) as PrismaAdapter;
	}

	throw new Error(`Unsupported DATABASE_URL scheme: ${url}`);
}

export class PrismaDatabaseProvider implements DatabaseProvider {
	private readonly client: PrismaClient;

	constructor(databaseUrl?: string) {
		const url = databaseUrl ?? getConfig().databaseUrl;
		ensureFileDatabaseDir(url);
		const adapter = createAdapter(url);
		this.client = new PrismaClientClass({ adapter });
	}

	getClient(): PrismaClient {
		return this.client;
	}

	async transaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
		return this.client.$transaction(fn);
	}
}
