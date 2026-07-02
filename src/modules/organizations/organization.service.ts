import type { OrganizationMode } from "#/platform/config";
import { ConflictError, NotFoundError } from "#/platform/errors";
import type { OrganizationStore } from "./organization.store";
import type { CreateOrganizationInput, Organization } from "./schemas";

export const DEFAULT_ORGANIZATION_NAME = "default";
export const DEFAULT_ORGANIZATION_DESCRIPTION = "Default organization";

export function createOrganizationService(
	store: OrganizationStore,
	mode: OrganizationMode,
) {
	async function ensureDefaultOrganization(): Promise<Organization> {
		const existing = await store.get(DEFAULT_ORGANIZATION_NAME);
		if (existing) {
			return existing;
		}
		try {
			return await store.create({
				name: DEFAULT_ORGANIZATION_NAME,
				description: DEFAULT_ORGANIZATION_DESCRIPTION,
			});
		} catch (error) {
			const concurrentlyCreated = await store.get(DEFAULT_ORGANIZATION_NAME);
			if (concurrentlyCreated) {
				return concurrentlyCreated;
			}
			throw error;
		}
	}

	async function getAccessibleOrganization(
		name: string,
	): Promise<Organization> {
		if (mode === "single") {
			if (name !== DEFAULT_ORGANIZATION_NAME) {
				throw new NotFoundError(`Organization "${name}" not found`);
			}
			return ensureDefaultOrganization();
		}
		const organization = await store.get(name);
		if (!organization) {
			throw new NotFoundError(`Organization "${name}" not found`);
		}
		return organization;
	}

	return {
		async createOrganization(
			input: CreateOrganizationInput,
		): Promise<Organization> {
			if (mode === "single") {
				throw new ConflictError(
					"Organizations cannot be created in single organization mode",
				);
			}
			return store.create(input);
		},
		async listOrganizations(): Promise<Organization[]> {
			if (mode === "single") {
				return [await ensureDefaultOrganization()];
			}
			return store.list();
		},
		getOrganization: getAccessibleOrganization,
		requireOrganization: getAccessibleOrganization,
	};
}

export type OrganizationService = ReturnType<typeof createOrganizationService>;
