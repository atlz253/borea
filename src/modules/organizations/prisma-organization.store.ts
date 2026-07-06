import type { DatabaseProvider } from "#/platform/database";
import { ConflictError } from "#/platform/errors";
import type { OrganizationStore } from "./organization.store";
import type {
	Organization,
	OrganizationRole,
	RepositoryRole,
	StoredOrganizationMember,
	StoredRepositoryAccess,
	StoredRepositoryMember,
	UpdateOrganizationInput,
} from "./schemas";

interface CreateOrganizationStoreInput {
	name: string;
	description?: string;
	initialMemberId?: string;
}

function rowToOrganization(row: {
	name: string;
	description: string | null;
	createdAt: string;
	ownerId: string | null;
}): Organization {
	return {
		name: row.name,
		description: row.description ?? undefined,
		createdAt: new Date(row.createdAt),
		ownerId: row.ownerId ?? undefined,
	};
}

export class PrismaOrganizationStore implements OrganizationStore {
	constructor(private readonly db: DatabaseProvider) {}

	async create(input: CreateOrganizationStoreInput): Promise<Organization> {
		const now = new Date().toISOString();
		try {
			await this.db.transaction(async (tx) => {
				await tx.organization.create({
					data: {
						name: input.name,
						description: input.description ?? null,
						createdAt: now,
						ownerId: input.initialMemberId ?? null,
					},
				});
				if (input.initialMemberId) {
					await tx.organizationMember.create({
						data: {
							organizationName: input.name,
							userId: input.initialMemberId,
							role: "owner",
							createdAt: now,
						},
					});
				}
			});
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "P2002"
			) {
				throw new ConflictError("Organization already exists");
			}
			throw error;
		}
		return {
			name: input.name,
			description: input.description,
			createdAt: new Date(now),
			ownerId: input.initialMemberId,
		};
	}

	async update(
		name: string,
		input: UpdateOrganizationInput,
	): Promise<Organization> {
		const row = await this.db.getClient().organization.update({
			where: { name },
			data: { description: input.description },
		});
		return rowToOrganization(row);
	}

	async delete(name: string): Promise<void> {
		await this.db.getClient().organization.delete({
			where: { name },
		});
	}

	async list(): Promise<Organization[]> {
		const rows = await this.db.getClient().organization.findMany({
			orderBy: { createdAt: "desc" },
		});
		return rows.map(rowToOrganization);
	}

	async get(name: string): Promise<Organization | undefined> {
		const row = await this.db.getClient().organization.findUnique({
			where: { name },
		});
		if (!row) return undefined;
		return rowToOrganization(row);
	}

	async addMember(
		name: string,
		userId: string,
	): Promise<StoredOrganizationMember> {
		const now = new Date().toISOString();
		try {
			await this.db.getClient().organizationMember.create({
				data: {
					organizationName: name,
					userId,
					role: "member",
					createdAt: now,
				},
			});
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "P2002"
			) {
				throw new ConflictError("User is already an organization member");
			}
			throw error;
		}
		return { userId, role: "member", createdAt: now };
	}

	async getMember(
		name: string,
		userId: string,
	): Promise<StoredOrganizationMember | undefined> {
		const row = await this.db.getClient().organizationMember.findUnique({
			where: { organizationName_userId: { organizationName: name, userId } },
		});
		if (!row) return undefined;
		return {
			userId: row.userId,
			role: row.role as OrganizationRole,
			createdAt: row.createdAt,
		};
	}

	async updateMemberRole(
		name: string,
		userId: string,
		role: OrganizationRole,
	): Promise<StoredOrganizationMember> {
		const row = await this.db.getClient().organizationMember.update({
			where: { organizationName_userId: { organizationName: name, userId } },
			data: { role },
		});
		return {
			userId: row.userId,
			role: row.role as OrganizationRole,
			createdAt: row.createdAt,
		};
	}

	async transferOwnership(
		name: string,
		currentOwnerId: string,
		nextOwnerId: string,
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx.organizationMember.update({
				where: {
					organizationName_userId: {
						organizationName: name,
						userId: currentOwnerId,
					},
				},
				data: { role: "member" },
			});
			await tx.organizationMember.upsert({
				where: {
					organizationName_userId: {
						organizationName: name,
						userId: nextOwnerId,
					},
				},
				update: { role: "owner" },
				create: {
					organizationName: name,
					userId: nextOwnerId,
					role: "owner",
					createdAt: new Date().toISOString(),
				},
			});
			await tx.organization.update({
				where: { name },
				data: { ownerId: nextOwnerId },
			});
		});
	}

	async removeMember(name: string, userId: string): Promise<void> {
		await this.db.getClient().organizationMember.delete({
			where: { organizationName_userId: { organizationName: name, userId } },
		});
	}

	async listMembers(name: string): Promise<StoredOrganizationMember[]> {
		const rows = await this.db.getClient().organizationMember.findMany({
			where: { organizationName: name },
			orderBy: { createdAt: "asc" },
		});
		return rows.map((r) => ({
			userId: r.userId,
			role: r.role as OrganizationRole,
			createdAt: r.createdAt,
		}));
	}

	async createRepositoryAccess(
		name: string,
		repositoryName: string,
		ownerId: string,
	): Promise<StoredRepositoryAccess> {
		const now = new Date().toISOString();
		const rid = `${name}/${repositoryName}`;
		try {
			await this.db.transaction(async (tx) => {
				await tx.repository.create({
					data: {
						id: rid,
						organizationName: name,
						name: repositoryName,
						createdAt: now,
						ownerId,
					},
				});
				await tx.pullRequestCounter.create({
					data: {
						repositoryId: rid,
						lastNumber: 0,
					},
				});
			});
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "P2002"
			) {
				throw new ConflictError("Repository already exists");
			}
			throw error;
		}
		return { ownerId, createdAt: now };
	}

	async getRepositoryAccess(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryAccess | undefined> {
		const row = await this.db.getClient().repository.findUnique({
			where: { id: `${name}/${repositoryName}` },
		});
		if (!row) return undefined;
		return { ownerId: row.ownerId, createdAt: row.createdAt };
	}

	async deleteRepositoryAccess(
		name: string,
		repositoryName: string,
	): Promise<void> {
		await this.db.getClient().repository.delete({
			where: { id: `${name}/${repositoryName}` },
		});
	}

	async listRepositoryAccess(
		name: string,
	): Promise<Array<StoredRepositoryAccess & { repositoryName: string }>> {
		const rows = await this.db.getClient().repository.findMany({
			where: { organizationName: name },
		});
		return rows.map((r) => ({
			ownerId: r.ownerId,
			createdAt: r.createdAt,
			repositoryName: r.name,
		}));
	}

	async setRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
		role: RepositoryRole,
	): Promise<StoredRepositoryMember> {
		const now = new Date().toISOString();
		const repoId = `${name}/${repositoryName}`;
		const existing = await this.db.getClient().repositoryMember.findUnique({
			where: { repositoryId_userId: { repositoryId: repoId, userId } },
		});
		await this.db.getClient().repositoryMember.upsert({
			where: { repositoryId_userId: { repositoryId: repoId, userId } },
			update: { role, updatedAt: now },
			create: {
				repositoryId: repoId,
				userId,
				role,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			},
		});
		return {
			userId,
			role,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
	}

	async getRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<StoredRepositoryMember | undefined> {
		const row = await this.db.getClient().repositoryMember.findUnique({
			where: {
				repositoryId_userId: {
					repositoryId: `${name}/${repositoryName}`,
					userId,
				},
			},
		});
		if (!row) return undefined;
		return {
			userId: row.userId,
			role: row.role as RepositoryRole,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}

	async removeRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<void> {
		await this.db.getClient().repositoryMember.deleteMany({
			where: {
				repositoryId: `${name}/${repositoryName}`,
				userId,
			},
		});
	}

	async listRepositoryMembers(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryMember[]> {
		const rows = await this.db.getClient().repositoryMember.findMany({
			where: { repositoryId: `${name}/${repositoryName}` },
			orderBy: { createdAt: "asc" },
		});
		return rows.map((r) => ({
			userId: r.userId,
			role: r.role as RepositoryRole,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
		}));
	}
}
