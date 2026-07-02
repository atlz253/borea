import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ConflictError } from "#/platform/errors";
import {
	type Organization,
	organizationNameSchema,
	organizationStorageSchema,
} from "./schemas";

export interface OrganizationStore {
	create(input: {
		name: string;
		description?: string;
		ownerId?: string;
	}): Promise<Organization & { ownerId?: string }>;
	list(): Promise<Array<Organization & { ownerId?: string }>>;
	get(name: string): Promise<(Organization & { ownerId?: string }) | undefined>;
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

export class FileSystemOrganizationStore implements OrganizationStore {
	private readonly basePath: string;

	constructor(basePath: string) {
		this.basePath = path.resolve(basePath);
	}

	async create(input: {
		name: string;
		description?: string;
		ownerId?: string;
	}): Promise<Organization & { ownerId?: string }> {
		const organizationPath = resolveOrganizationPath(this.basePath, input.name);
		const metadataPath = path.join(organizationPath, "organization.json");
		if (existsSync(metadataPath)) {
			throw new ConflictError(`Organization "${input.name}" already exists`);
		}

		await mkdir(organizationPath, { recursive: true });
		if (existsSync(metadataPath)) {
			throw new ConflictError(`Organization "${input.name}" already exists`);
		}

		const organization: Organization = {
			name: input.name,
			description: input.description || undefined,
			createdAt: new Date(),
		};
		const storedOrganization = {
			...organization,
			...(input.ownerId ? { ownerId: input.ownerId } : {}),
		};
		const temporaryPath = path.join(organizationPath, "organization.tmp");
		await writeFile(
			temporaryPath,
			JSON.stringify(
				{
					...storedOrganization,
					createdAt: organization.createdAt.toISOString(),
				},
				null,
				"\t",
			),
			"utf-8",
		);
		try {
			await rename(temporaryPath, metadataPath);
		} catch (error) {
			if (existsSync(metadataPath)) {
				throw new ConflictError(`Organization "${input.name}" already exists`);
			}
			throw error;
		}
		return storedOrganization;
	}

	async list(): Promise<Array<Organization & { ownerId?: string }>> {
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
}
