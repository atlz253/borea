import { PrismaOrganizationStore } from "#/modules/organizations/prisma-organization.store";
import type { PrismaDatabaseProvider } from "#/platform/database";

export const NOAUTH_USER_ID = "00000000-0000-4000-8000-000000000000";

export async function ensureRepositoryRecord(
	db: PrismaDatabaseProvider,
	organizationName: string,
	repositoryName: string,
	ownerId: string = NOAUTH_USER_ID,
): Promise<void> {
	const store = new PrismaOrganizationStore(db);
	try {
		await store.createRepositoryAccess(
			organizationName,
			repositoryName,
			ownerId,
		);
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "P2002"
		) {
			return;
		}
		throw error;
	}
}
