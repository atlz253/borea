import type { AuthProvider, User } from "#/modules/auth";
import type { OrganizationMode } from "#/platform/config";
import { ConflictError, NotFoundError } from "#/platform/errors";
import type { OrganizationStore } from "./organization.store";
import type {
	CreateOrganizationInput,
	InviteOrganizationMemberInput,
	Organization,
} from "./schemas";

export const DEFAULT_ORGANIZATION_NAME = "default";
export const DEFAULT_ORGANIZATION_DESCRIPTION = "Default organization";

type UserDirectory = Pick<AuthProvider, "getUserByEmail" | "getUserById">;

export function createOrganizationService(
	store: OrganizationStore,
	mode: OrganizationMode,
	bypassMembership = false,
	users?: UserDirectory,
) {
	let defaultOrganizationPromise: Promise<Organization> | undefined;

	async function ensureDefaultOrganization(): Promise<Organization> {
		const existing = await store.get(DEFAULT_ORGANIZATION_NAME);
		if (existing) {
			return existing;
		}
		if (defaultOrganizationPromise) {
			return defaultOrganizationPromise;
		}
		defaultOrganizationPromise = store.create({
			name: DEFAULT_ORGANIZATION_NAME,
			description: DEFAULT_ORGANIZATION_DESCRIPTION,
		});
		try {
			return await defaultOrganizationPromise;
		} catch (error) {
			const concurrentlyCreated = await store.get(DEFAULT_ORGANIZATION_NAME);
			if (concurrentlyCreated) {
				return concurrentlyCreated;
			}
			throw error;
		} finally {
			defaultOrganizationPromise = undefined;
		}
	}

	async function getAccessibleOrganization(
		name: string,
		userId?: string,
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
			(!bypassMembership && (!userId || !(await store.hasMember(name, userId))))
		) {
			throw new NotFoundError(`Organization "${name}" not found`);
		}
		return organization;
	}

	function requireMembershipManagement(): UserDirectory {
		if (bypassMembership || !users) {
			throw new ConflictError(
				"Organization membership is unavailable in NoAuth mode",
			);
		}
		return users;
	}

	return {
		async createOrganization(
			input: CreateOrganizationInput,
			userId?: string,
		): Promise<Organization> {
			if (mode === "single") {
				throw new ConflictError(
					"Organizations cannot be created in single organization mode",
				);
			}
			if (!bypassMembership && !userId) {
				throw new ConflictError(
					"An authenticated user is required to create an organization",
				);
			}
			return store.create({
				...input,
				...(userId ? { initialMemberId: userId } : {}),
			});
		},
		async listOrganizations(userId?: string): Promise<Organization[]> {
			if (mode === "single") {
				return [await ensureDefaultOrganization()];
			}
			const organizations = await store.list();
			if (bypassMembership) {
				return organizations;
			}
			if (!userId) {
				return [];
			}
			const membership = await Promise.all(
				organizations.map((organization) =>
					store.hasMember(organization.name, userId),
				),
			);
			return organizations.filter((_, index) => membership[index]);
		},
		async listOrganizationMembers(
			name: string,
			userId?: string,
		): Promise<User[]> {
			const directory = requireMembershipManagement();
			await getAccessibleOrganization(name, userId);
			const memberIds = await store.listMemberIds(name);
			const members = await Promise.all(
				memberIds.map((memberId) => directory.getUserById(memberId)),
			);
			return members.filter((member): member is User => Boolean(member));
		},
		async inviteOrganizationMember(
			name: string,
			input: InviteOrganizationMemberInput,
			userId?: string,
		): Promise<User> {
			const directory = requireMembershipManagement();
			await getAccessibleOrganization(name, userId);
			const invitedUser = await directory.getUserByEmail(input.email);
			if (!invitedUser) {
				throw new NotFoundError(`User "${input.email}" not found`);
			}
			await store.addMember(name, invitedUser.id);
			return invitedUser;
		},
		getOrganization: getAccessibleOrganization,
		requireOrganization: getAccessibleOrganization,
	};
}

export type OrganizationService = ReturnType<typeof createOrganizationService>;
