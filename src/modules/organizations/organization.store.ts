import { existsSync } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ConflictError } from "#/platform/errors";
import {
	type Organization,
	organizationMemberStorageSchema,
	organizationNameSchema,
	organizationStorageSchema,
} from "./schemas";

interface CreateOrganizationStoreInput {
	name: string;
	description?: string;
	initialMemberId?: string;
}

export interface OrganizationStore {
	create(input: CreateOrganizationStoreInput): Promise<Organization>;
	list(): Promise<Organization[]>;
	get(name: string): Promise<Organization | undefined>;
	addMember(name: string, userId: string): Promise<void>;
	hasMember(name: string, userId: string): Promise<boolean>;
	listMemberIds(name: string): Promise<string[]>;
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

function serialize(value: object): string {
	return JSON.stringify(value, null, "\t");
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

		const organization: Organization = {
			name: input.name,
			description: input.description || undefined,
			createdAt: new Date(),
		};
		let createdDirectory = false;

		try {
			await mkdir(organizationPath);
			createdDirectory = true;
			if (input.initialMemberId) {
				const userId = z.uuid().parse(input.initialMemberId);
				const membersPath = path.join(organizationPath, "members");
				await mkdir(membersPath);
				await writeFile(
					path.join(membersPath, `${userId}.json`),
					serialize({
						userId,
						createdAt: organization.createdAt.toISOString(),
					}),
					"utf-8",
				);
			}
			const temporaryMetadataPath = path.join(
				organizationPath,
				"organization.tmp",
			);
			await writeFile(
				temporaryMetadataPath,
				serialize({
					...organization,
					createdAt: organization.createdAt.toISOString(),
				}),
				"utf-8",
			);
			await rename(
				temporaryMetadataPath,
				path.join(organizationPath, "organization.json"),
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
		const metadataPath = path.join(
			resolveOrganizationPath(this.basePath, name),
			"organization.json",
		);
		if (!existsSync(metadataPath)) {
			return undefined;
		}
		try {
			const stored = organizationStorageSchema.parse(
				JSON.parse(await readFile(metadataPath, "utf-8")),
			);
			return { ...stored, createdAt: new Date(stored.createdAt) };
		} catch {
			return undefined;
		}
	}

	async addMember(name: string, userId: string): Promise<void> {
		const memberPath = resolveMemberPath(this.basePath, name, userId);
		await mkdir(path.dirname(memberPath), { recursive: true });
		try {
			await writeFile(
				memberPath,
				serialize({ userId, createdAt: new Date().toISOString() }),
				{ encoding: "utf-8", flag: "wx" },
			);
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
	}

	async hasMember(name: string, userId: string): Promise<boolean> {
		try {
			organizationMemberStorageSchema.parse(
				JSON.parse(
					await readFile(
						resolveMemberPath(this.basePath, name, userId),
						"utf-8",
					),
				),
			);
			return true;
		} catch {
			return false;
		}
	}

	async listMemberIds(name: string): Promise<string[]> {
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
				.map(async (entry) => {
					try {
						return organizationMemberStorageSchema.parse(
							JSON.parse(
								await readFile(path.join(membersPath, entry.name), "utf-8"),
							),
						);
					} catch {
						return undefined;
					}
				}),
		);
		return members
			.filter(
				(
					member,
				): member is {
					userId: string;
					createdAt: string;
				} => Boolean(member),
			)
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
			.map((member) => member.userId);
	}
}
