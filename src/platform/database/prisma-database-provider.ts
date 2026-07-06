import type { Config } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
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

export class PrismaDatabaseProvider implements DatabaseProvider {
	private readonly client: PrismaClient;

	constructor(databaseUrl?: string) {
		const url = databaseUrl ?? getConfig().databaseUrl;
		ensureFileDatabaseDir(url);
		const adapter = new PrismaLibSql({ url } satisfies Config);
		this.client = new PrismaClientClass({ adapter });
	}

	getClient(): PrismaClient {
		return this.client;
	}

	async transaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
		return this.client.$transaction(fn);
	}
}
