import type { PrismaClient } from "#/generated/prisma/client";

type TxClient = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

export interface DatabaseProvider {
	getClient(): PrismaClient;
	transaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T>;
}
