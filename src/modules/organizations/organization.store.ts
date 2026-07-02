import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ConflictError } from "#/platform/errors";
import {
	type Organization,
	type OrganizationRole,
	organizationMemberStorageSchema,
	organizationNameSchema,
	organizationStorageSchema,
	type RepositoryRole,
	repositoryAccessStorageSchema,
	repositoryMemberStorageSchema,
	type StoredOrganizationMember,
	type StoredRepositoryAccess,
	type StoredRepositoryMember,
	type UpdateOrganizationInput,
} from "./schemas";

interface CreateOrganizationStoreInput {
	name: string;
	description?: string;
	initialMemberId?: string;
}

export interface OrganizationStore {
	create(input: CreateOrganizationStoreInput): Promise<Organization>;
	update(name: string, input: UpdateOrganizationInput): Promise<Organization>;
	delete(name: string): Promise<void>;
	list(): Promise<Organization[]>;
	get(name: string): Promise<Organization | undefined>;
	addMember(name: string, userId: string): Promise<StoredOrganizationMember>;
	getMember(
		name: string,
		userId: string,
	): Promise<StoredOrganizationMember | undefined>;
	updateMemberRole(
		name: string,
		userId: string,
		role: OrganizationRole,
	): Promise<StoredOrganizationMember>;
	transferOwnership(
		name: string,
		currentOwnerId: string,
		nextOwnerId: string,
	): Promise<void>;
	removeMember(name: string, userId: string): Promise<void>;
	listMembers(name: string): Promise<StoredOrganizationMember[]>;
	createRepositoryAccess(
		name: string,
		repositoryName: string,
		ownerId: string,
	): Promise<StoredRepositoryAccess>;
	getRepositoryAccess(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryAccess | undefined>;
	deleteRepositoryAccess(name: string, repositoryName: string): Promise<void>;
	listRepositoryAccess(
		name: string,
	): Promise<Array<StoredRepositoryAccess & { repositoryName: string }>>;
	setRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
		role: RepositoryRole,
	): Promise<StoredRepositoryMember>;
	getRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<StoredRepositoryMember | undefined>;
	removeRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<void>;
	listRepositoryMembers(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryMember[]>;
}

function resolveOrganizationPath(basePath: string, name: string): string {
	organizationNameSchema.parse(name);
	const root = path.resolve(basePath);
	const resolved = path.resolve(root, name);
	if (!resolved.startsWith(`${root}${path.sep}`)) {
		throw new Error("Invalid organization name");
	}
	return resolved;
}

function resolveRepositoryAccessPath(
	basePath: string,
	organizationName: string,
	repositoryName: string,
): string {
	if (
		!repositoryName ||
		repositoryName === "." ||
		repositoryName === ".." ||
		repositoryName.includes("/") ||
		repositoryName.includes("\\")
	) {
		throw new Error("Invalid repository name");
	}
	const repositoriesPath = path.join(
		resolveOrganizationPath(basePath, organizationName),
		"repositories",
	);
	const resolved = path.resolve(repositoriesPath, repositoryName);
	if (!resolved.startsWith(`${path.resolve(repositoriesPath)}${path.sep}`)) {
		throw new Error("Invalid repository name");
	}
	return resolved;
}

function resolveMemberPath(
	basePath: string,
	organizationName: string,
	userId: string,
): string {
	const parsedUserId = z.uuid().parse(userId);
	return path.join(
		resolveOrganizationPath(basePath, organizationName),
		"members",
		`${parsedUserId}.json`,
	);
}

function resolveRepositoryMemberPath(
	basePath: string,
	organizationName: string,
	repositoryName: string,
	userId: string,
): string {
	const parsedUserId = z.uuid().parse(userId);
	return path.join(
		resolveRepositoryAccessPath(basePath, organizationName, repositoryName),
		"members",
		`${parsedUserId}.json`,
	);
}

function serialize(value: object): string {
	return JSON.stringify(value, null, "\t");
}

async function writeJsonAtomic(filePath: string, value: object): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporaryPath, serialize(value), "utf-8");
		await rename(temporaryPath, filePath);
	} catch (error) {
		await rm(temporaryPath, { force: true });
		throw error;
	}
}

async function readStored<T>(
	filePath: string,
	schema: z.ZodType<T>,
): Promise<T | undefined> {
	try {
		return schema.parse(JSON.parse(await readFile(filePath, "utf-8")));
	} catch {
		return undefined;
	}
}

export class FileSystemOrganizationStore implements OrganizationStore {
	private readonly basePath: string;

	constructor(basePath: string) {
		this.basePath = path.resolve(basePath);
	}

	async create(input: CreateOrganizationStoreInput): Promise<Organization> {
		await mkdir(this.basePath, { recursive: true });
		const organizationPath = resolveOrganizationPath(this.basePath, input.name);
		if (existsSync(organizationPath)) {
			throw new ConflictError(`Organization "${input.name}" already exists`);
		}

		const ownerId = input.initialMemberId
			? z.uuid().parse(input.initialMemberId)
			: undefined;
		const organization: Organization = {
			name: input.name,
			description: input.description || undefined,
			createdAt: new Date(),
			ownerId,
		};
		let createdDirectory = false;

		try {
			await mkdir(organizationPath);
			createdDirectory = true;
			if (ownerId) {
				const membersPath = path.join(organizationPath, "members");
				await mkdir(membersPath);
				await writeFile(
					path.join(membersPath, `${ownerId}.json`),
					serialize({
						userId: ownerId,
						role: "owner",
						createdAt: organization.createdAt.toISOString(),
					}),
					"utf-8",
				);
			}
			await writeJsonAtomic(
				path.join(organizationPath, "organization.json"),
				this.storedOrganization(organization),
			);
		} catch (error) {
			if (createdDirectory) {
				await rm(organizationPath, { recursive: true, force: true });
			} else if (existsSync(organizationPath)) {
				throw new ConflictError(`Organization "${input.name}" already exists`);
			}
			throw error;
		}

		return organization;
	}

	async update(
		name: string,
		input: UpdateOrganizationInput,
	): Promise<Organization> {
		const organization = await this.get(name);
		if (!organization) {
			throw new Error(`Organization "${name}" not found`);
		}
		const updated = {
			...organization,
			description: input.description || undefined,
		};
		await writeJsonAtomic(
			path.join(
				resolveOrganizationPath(this.basePath, name),
				"organization.json",
			),
			this.storedOrganization(updated),
		);
		return updated;
	}

	async delete(name: string): Promise<void> {
		await rm(resolveOrganizationPath(this.basePath, name), {
			recursive: true,
			force: true,
		});
	}

	async list(): Promise<Organization[]> {
		await mkdir(this.basePath, { recursive: true });
		const entries = await readdir(this.basePath, { withFileTypes: true });
		const organizations = await Promise.all(
			entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => this.get(entry.name)),
		);
		return organizations
			.filter((organization): organization is Organization =>
				Boolean(organization),
			)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	async get(name: string): Promise<Organization | undefined> {
		const stored = await readStored(
			path.join(
				resolveOrganizationPath(this.basePath, name),
				"organization.json",
			),
			organizationStorageSchema,
		);
		return stored
			? { ...stored, createdAt: new Date(stored.createdAt) }
			: undefined;
	}

	async addMember(
		name: string,
		userId: string,
	): Promise<StoredOrganizationMember> {
		const memberPath = resolveMemberPath(this.basePath, name, userId);
		const member = {
			userId: z.uuid().parse(userId),
			role: "member" as const,
			createdAt: new Date().toISOString(),
		};
		await mkdir(path.dirname(memberPath), { recursive: true });
		try {
			await writeFile(memberPath, serialize(member), {
				encoding: "utf-8",
				flag: "wx",
			});
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "EEXIST"
			) {
				throw new ConflictError("User is already an organization member");
			}
			throw error;
		}
		return member;
	}

	getMember(
		name: string,
		userId: string,
	): Promise<StoredOrganizationMember | undefined> {
		return readStored(
			resolveMemberPath(this.basePath, name, userId),
			organizationMemberStorageSchema,
		);
	}

	async updateMemberRole(
		name: string,
		userId: string,
		role: OrganizationRole,
	): Promise<StoredOrganizationMember> {
		const member = await this.getMember(name, userId);
		if (!member) {
			throw new Error("Organization member not found");
		}
		const updated = { ...member, role };
		await writeJsonAtomic(
			resolveMemberPath(this.basePath, name, userId),
			updated,
		);
		return updated;
	}

	async transferOwnership(
		name: string,
		currentOwnerId: string,
		nextOwnerId: string,
	): Promise<void> {
		const organization = await this.get(name);
		const currentOwner = await this.getMember(name, currentOwnerId);
		const nextOwner = await this.getMember(name, nextOwnerId);
		if (
			!organization ||
			organization.ownerId !== currentOwnerId ||
			!currentOwner ||
			!nextOwner
		) {
			throw new Error("Organization owner or member not found");
		}
		await this.updateMemberRole(name, currentOwnerId, "member");
		await this.updateMemberRole(name, nextOwnerId, "owner");
		await writeJsonAtomic(
			path.join(
				resolveOrganizationPath(this.basePath, name),
				"organization.json",
			),
			this.storedOrganization({ ...organization, ownerId: nextOwnerId }),
		);
	}

	async removeMember(name: string, userId: string): Promise<void> {
		await unlink(resolveMemberPath(this.basePath, name, userId));
	}

	async listMembers(name: string): Promise<StoredOrganizationMember[]> {
		const membersPath = path.join(
			resolveOrganizationPath(this.basePath, name),
			"members",
		);
		if (!existsSync(membersPath)) {
			return [];
		}
		const entries = await readdir(membersPath, { withFileTypes: true });
		const members = await Promise.all(
			entries
				.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
				.map((entry) =>
					readStored(
						path.join(membersPath, entry.name),
						organizationMemberStorageSchema,
					),
				),
		);
		return members
			.filter((member): member is StoredOrganizationMember => Boolean(member))
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}

	async createRepositoryAccess(
		name: string,
		repositoryName: string,
		ownerId: string,
	): Promise<StoredRepositoryAccess> {
		const repositoryPath = resolveRepositoryAccessPath(
			this.basePath,
			name,
			repositoryName,
		);
		if (existsSync(repositoryPath)) {
			throw new ConflictError("Repository access already exists");
		}
		const access = {
			ownerId: z.uuid().parse(ownerId),
			createdAt: new Date().toISOString(),
		};
		await mkdir(path.dirname(repositoryPath), { recursive: true });
		try {
			await mkdir(repositoryPath);
			await writeFile(
				path.join(repositoryPath, "repository.json"),
				serialize(access),
				"utf-8",
			);
		} catch (error) {
			await rm(repositoryPath, { recursive: true, force: true });
			throw error;
		}
		return access;
	}

	getRepositoryAccess(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryAccess | undefined> {
		return readStored(
			path.join(
				resolveRepositoryAccessPath(this.basePath, name, repositoryName),
				"repository.json",
			),
			repositoryAccessStorageSchema,
		);
	}

	async deleteRepositoryAccess(
		name: string,
		repositoryName: string,
	): Promise<void> {
		await rm(resolveRepositoryAccessPath(this.basePath, name, repositoryName), {
			recursive: true,
			force: true,
		});
	}

	async listRepositoryAccess(
		name: string,
	): Promise<Array<StoredRepositoryAccess & { repositoryName: string }>> {
		const repositoriesPath = path.join(
			resolveOrganizationPath(this.basePath, name),
			"repositories",
		);
		if (!existsSync(repositoriesPath)) {
			return [];
		}
		const entries = await readdir(repositoriesPath, { withFileTypes: true });
		const access = await Promise.all(
			entries
				.filter((entry) => entry.isDirectory())
				.map(async (entry) => {
					const stored = await this.getRepositoryAccess(name, entry.name);
					return stored ? { ...stored, repositoryName: entry.name } : undefined;
				}),
		);
		return access.filter(
			(item): item is StoredRepositoryAccess & { repositoryName: string } =>
				Boolean(item),
		);
	}

	async setRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
		role: RepositoryRole,
	): Promise<StoredRepositoryMember> {
		const memberPath = resolveRepositoryMemberPath(
			this.basePath,
			name,
			repositoryName,
			userId,
		);
		const existing = await this.getRepositoryMember(
			name,
			repositoryName,
			userId,
		);
		const now = new Date().toISOString();
		const member = {
			userId: z.uuid().parse(userId),
			role,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		await writeJsonAtomic(memberPath, member);
		return member;
	}

	getRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<StoredRepositoryMember | undefined> {
		return readStored(
			resolveRepositoryMemberPath(this.basePath, name, repositoryName, userId),
			repositoryMemberStorageSchema,
		);
	}

	async removeRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<void> {
		await rm(
			resolveRepositoryMemberPath(this.basePath, name, repositoryName, userId),
			{ force: true },
		);
	}

	async listRepositoryMembers(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryMember[]> {
		const membersPath = path.join(
			resolveRepositoryAccessPath(this.basePath, name, repositoryName),
			"members",
		);
		if (!existsSync(membersPath)) {
			return [];
		}
		const entries = await readdir(membersPath, { withFileTypes: true });
		const members = await Promise.all(
			entries
				.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
				.map((entry) =>
					readStored(
						path.join(membersPath, entry.name),
						repositoryMemberStorageSchema,
					),
				),
		);
		return members
			.filter((member): member is StoredRepositoryMember => Boolean(member))
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}

	private storedOrganization(organization: Organization) {
		return {
			name: organization.name,
			...(organization.description
				? { description: organization.description }
				: {}),
			createdAt: organization.createdAt.toISOString(),
			...(organization.ownerId ? { ownerId: organization.ownerId } : {}),
		};
	}
}
