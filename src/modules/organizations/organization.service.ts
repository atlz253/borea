import type { OrganizationMode } from "#/platform/config";
import { ConflictError, NotFoundError } from "#/platform/errors";
import type { OrganizationStore } from "./organization.store";
import type { CreateOrganizationInput, Organization } from "./schemas";

export const DEFAULT_ORGANIZATION_NAME = "default";
export const DEFAULT_ORGANIZATION_DESCRIPTION = "Default organization";

function publicOrganization(
	organization: Organization & { ownerId?: string },
): Organization {
	const { ownerId: _ownerId, ...result } = organization;
	return result;
}

export function createOrganizationService(
	store: OrganizationStore,
	mode: OrganizationMode,
	bypassOwnership = false,
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
		ownerId?: string,
	): Promise<Organization> {
		if (mode === "single") {
			if (name !== DEFAULT_ORGANIZATION_NAME) {
				throw new NotFoundError(`Organization "${name}" not found`);
			}
			return ensureDefaultOrganization();
		}
		const organization = await store.get(name);
		if (
			!organization ||
			(!bypassOwnership &&
				(!ownerId || !organization.ownerId || organization.ownerId !== ownerId))
		) {
			throw new NotFoundError(`Organization "${name}" not found`);
		}
		return publicOrganization(organization);
	}

	return {
		async createOrganization(
			input: CreateOrganizationInput,
			ownerId?: string,
		): Promise<Organization> {
			if (mode === "single") {
				throw new ConflictError(
					"Organizations cannot be created in single organization mode",
				);
			}
			return publicOrganization(
				await store.create({
					...input,
					...(bypassOwnership ? {} : { ownerId }),
				}),
			);
		},
		async listOrganizations(ownerId?: string): Promise<Organization[]> {
			if (mode === "single") {
				return [await ensureDefaultOrganization()];
			}
			const organizations = await store.list();
			if (bypassOwnership) {
				return organizations.map(publicOrganization);
			}
			return organizations
				.filter(
					(organization) =>
						Boolean(ownerId) && organization.ownerId === ownerId,
				)
				.map(publicOrganization);
		},
		getOrganization: getAccessibleOrganization,
		requireOrganization: getAccessibleOrganization,
	};
}

export type OrganizationService = ReturnType<typeof createOrganizationService>;
