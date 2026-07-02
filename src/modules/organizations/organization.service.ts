import type { AuthProvider } from "#/modules/auth";
import type { OrganizationMode } from "#/platform/config";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "#/platform/errors";
import {
	canAssignOrganizationRole,
	canManageRepositoryRole,
	canRemoveOrganizationMember,
	hasOrganizationPermission,
	type OrganizationPermission,
} from "./access-control";
import {
	type OrganizationAccessSummary,
	type RepositoryAccessSummary,
	toOrganizationMember,
	toRepositoryMember,
} from "./access-control.types";
import type { OrganizationStore } from "./organization.store";
import { createRepositoryAccessPolicy } from "./repository-access.service";
import type {
	CreateOrganizationInput,
	InviteOrganizationMemberInput,
	Organization,
	OrganizationMember,
	OrganizationRole,
	RepositoryMember,
	RepositoryRole,
	UpdateOrganizationInput,
} from "./schemas";

export const DEFAULT_ORGANIZATION_NAME = "default";
export const DEFAULT_ORGANIZATION_DESCRIPTION = "Default organization";

type UserDirectory = Pick<AuthProvider, "getUserByEmail" | "getUserById">;

export function createOrganizationService(
	store: OrganizationStore,
	mode: OrganizationMode,
	bypassAccess = false,
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

	async function getStoredOrganization(name: string): Promise<Organization> {
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

	async function getEffectiveRole(
		organization: Organization,
		userId: string,
	): Promise<OrganizationRole | undefined> {
		const member = await store.getMember(organization.name, userId);
		if (!member) {
			return undefined;
		}
		if (organization.ownerId === userId) {
			return "owner";
		}
		return member.role === "owner" ? "member" : member.role;
	}

	async function getAccessibleOrganization(
		name: string,
		userId?: string,
	): Promise<Organization> {
		const organization = await getStoredOrganization(name);
		if (bypassAccess) {
			return organization;
		}
		if (!userId || !(await getEffectiveRole(organization, userId))) {
			throw new NotFoundError(`Organization "${name}" not found`);
		}
		return organization;
	}

	async function requireOrganizationPermission(
		name: string,
		userId: string | undefined,
		permission: OrganizationPermission,
	): Promise<{ organization: Organization; role?: OrganizationRole }> {
		const organization = await getAccessibleOrganization(name, userId);
		if (bypassAccess) {
			return { organization };
		}
		const role = userId
			? await getEffectiveRole(organization, userId)
			: undefined;
		if (!role || !hasOrganizationPermission(role, permission)) {
			throw new ForbiddenError(
				`You do not have permission to ${permission} in this organization`,
			);
		}
		return { organization, role };
	}

	function requireMembershipManagement(): UserDirectory {
		if (bypassAccess || !users) {
			throw new ConflictError(
				"Organization membership is unavailable in NoAuth mode",
			);
		}
		return users;
	}

	async function clearRepositoryGrants(
		organizationName: string,
		userId: string,
	): Promise<void> {
		const repositoryAccess = await store.listRepositoryAccess(organizationName);
		await Promise.all(
			repositoryAccess.map((access) =>
				store.removeRepositoryMember(
					organizationName,
					access.repositoryName,
					userId,
				),
			),
		);
	}

	const repositoryAccessPolicy = createRepositoryAccessPolicy({
		store,
		bypassAccess,
		getAccessibleOrganization,
		getEffectiveRole,
	});

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
			if (!userId) {
				throw new ConflictError(
					"An authenticated user is required to create an organization",
				);
			}
			return store.create({ ...input, initialMemberId: userId });
		},
		async listOrganizations(userId?: string): Promise<Organization[]> {
			if (mode === "single") {
				return [await ensureDefaultOrganization()];
			}
			const organizations = await store.list();
			if (bypassAccess) {
				return organizations;
			}
			if (!userId) {
				return [];
			}
			const roles = await Promise.all(
				organizations.map((organization) =>
					getEffectiveRole(organization, userId),
				),
			);
			return organizations.filter((_, index) => Boolean(roles[index]));
		},
		async getOrganizationAccess(
			name: string,
			userId?: string,
		): Promise<OrganizationAccessSummary> {
			const organization = await getAccessibleOrganization(name, userId);
			if (bypassAccess) {
				return {
					canInviteMembers: false,
					canManageMemberRoles: false,
					canRemoveMembers: false,
					canManageSettings: false,
					canCreateRepository: true,
					canDeleteOrganization: false,
				};
			}
			const role = userId
				? await getEffectiveRole(organization, userId)
				: undefined;
			if (!role) {
				throw new NotFoundError(`Organization "${name}" not found`);
			}
			return {
				role,
				canInviteMembers: hasOrganizationPermission(role, "inviteMembers"),
				canManageMemberRoles: hasOrganizationPermission(
					role,
					"manageMemberRoles",
				),
				canRemoveMembers: hasOrganizationPermission(role, "removeMembers"),
				canManageSettings: hasOrganizationPermission(role, "manageSettings"),
				canCreateRepository: hasOrganizationPermission(
					role,
					"createRepository",
				),
				canDeleteOrganization: hasOrganizationPermission(
					role,
					"deleteOrganization",
				),
			};
		},
		async updateOrganization(
			name: string,
			input: UpdateOrganizationInput,
			userId?: string,
		): Promise<Organization> {
			await requireOrganizationPermission(name, userId, "manageSettings");
			return store.update(name, input);
		},
		async deleteOrganizationMetadata(
			name: string,
			userId?: string,
		): Promise<void> {
			await requireOrganizationPermission(name, userId, "deleteOrganization");
			await store.delete(name);
		},
		async listOrganizationMembers(
			name: string,
			userId?: string,
		): Promise<OrganizationMember[]> {
			const directory = requireMembershipManagement();
			const organization = await getAccessibleOrganization(name, userId);
			const members = await store.listMembers(name);
			const resolved = await Promise.all(
				members.map(async (member) => {
					const user = await directory.getUserById(member.userId);
					if (!user) {
						return undefined;
					}
					const role =
						organization.ownerId === member.userId
							? "owner"
							: member.role === "owner"
								? "member"
								: member.role;
					return toOrganizationMember(user, role);
				}),
			);
			return resolved.filter((member): member is OrganizationMember =>
				Boolean(member),
			);
		},
		async inviteOrganizationMember(
			name: string,
			input: InviteOrganizationMemberInput,
			userId?: string,
		): Promise<OrganizationMember> {
			const directory = requireMembershipManagement();
			await requireOrganizationPermission(name, userId, "inviteMembers");
			const invitedUser = await directory.getUserByEmail(input.email);
			if (!invitedUser) {
				throw new NotFoundError(`User "${input.email}" not found`);
			}
			await store.addMember(name, invitedUser.id);
			return toOrganizationMember(invitedUser, "member");
		},
		async updateOrganizationMemberRole(
			name: string,
			targetUserId: string,
			nextRole: OrganizationRole,
			userId?: string,
		): Promise<OrganizationMember> {
			const directory = requireMembershipManagement();
			const { organization, role: actorRole } =
				await requireOrganizationPermission(name, userId, "manageMemberRoles");
			const target = await store.getMember(name, targetUserId);
			const targetUser = await directory.getUserById(targetUserId);
			if (!actorRole || !target || !targetUser) {
				throw new NotFoundError("Organization member not found");
			}
			const targetRole =
				organization.ownerId === targetUserId ? "owner" : target.role;
			if (
				!canAssignOrganizationRole(
					actorRole,
					targetRole,
					nextRole,
					targetUserId === userId,
				)
			) {
				throw new ForbiddenError("You cannot assign this organization role");
			}
			if (nextRole === "owner") {
				if (!userId || actorRole !== "owner") {
					throw new ForbiddenError("Only the owner can transfer ownership");
				}
				await clearRepositoryGrants(name, targetUserId);
				await store.transferOwnership(name, userId, targetUserId);
				return toOrganizationMember(targetUser, "owner");
			}
			if (nextRole !== "member") {
				await clearRepositoryGrants(name, targetUserId);
			}
			await store.updateMemberRole(name, targetUserId, nextRole);
			return toOrganizationMember(targetUser, nextRole);
		},
		async removeOrganizationMember(
			name: string,
			targetUserId: string,
			userId?: string,
		): Promise<void> {
			requireMembershipManagement();
			const { organization, role: actorRole } =
				await requireOrganizationPermission(name, userId, "removeMembers");
			const target = await store.getMember(name, targetUserId);
			if (!actorRole || !target) {
				throw new NotFoundError("Organization member not found");
			}
			const targetRole =
				organization.ownerId === targetUserId ? "owner" : target.role;
			if (
				!canRemoveOrganizationMember(
					actorRole,
					targetRole,
					targetUserId === userId,
				)
			) {
				throw new ForbiddenError("You cannot remove this organization member");
			}
			const repositoryAccess = await store.listRepositoryAccess(name);
			if (repositoryAccess.some((access) => access.ownerId === targetUserId)) {
				throw new ConflictError(
					"Repository owners cannot be removed from the organization",
				);
			}
			await clearRepositoryGrants(name, targetUserId);
			await store.removeMember(name, targetUserId);
		},
		async createRepositoryAccess(
			organizationName: string,
			repositoryName: string,
			userId?: string,
		) {
			await requireOrganizationPermission(
				organizationName,
				userId,
				"createRepository",
			);
			if (!userId) {
				throw new ConflictError("Repository owner is required");
			}
			return store.createRepositoryAccess(
				organizationName,
				repositoryName,
				userId,
			);
		},
		async deleteRepositoryAccess(
			organizationName: string,
			repositoryName: string,
		): Promise<void> {
			await store.deleteRepositoryAccess(organizationName, repositoryName);
		},
		async canReadRepository(
			organizationName: string,
			repositoryName: string,
			userId?: string,
		): Promise<boolean> {
			return repositoryAccessPolicy.canRead(
				organizationName,
				repositoryName,
				userId,
			);
		},
		async getRepositoryAccess(
			organizationName: string,
			repositoryName: string,
			userId?: string,
		): Promise<RepositoryAccessSummary> {
			return repositoryAccessPolicy.getSummary(
				organizationName,
				repositoryName,
				userId,
			);
		},
		requireOrganizationPermission,
		requireRepositoryPermission: repositoryAccessPolicy.requirePermission,
		async listRepositoryMembers(
			organizationName: string,
			repositoryName: string,
			userId?: string,
		): Promise<RepositoryMember[]> {
			const directory = requireMembershipManagement();
			await repositoryAccessPolicy.requirePermission(
				organizationName,
				repositoryName,
				userId,
				"manageAccess",
			);
			const members = await store.listRepositoryMembers(
				organizationName,
				repositoryName,
			);
			const resolved = await Promise.all(
				members.map(async (member) => {
					const user = await directory.getUserById(member.userId);
					return user ? toRepositoryMember(user, member.role) : undefined;
				}),
			);
			return resolved.filter((member): member is RepositoryMember =>
				Boolean(member),
			);
		},
		async setRepositoryMemberRole(
			organizationName: string,
			repositoryName: string,
			targetUserId: string,
			nextRole: RepositoryRole,
			userId?: string,
		): Promise<RepositoryMember> {
			const directory = requireMembershipManagement();
			const context = await repositoryAccessPolicy.requirePermission(
				organizationName,
				repositoryName,
				userId,
				"manageAccess",
			);
			const [access, target, targetUser, current] = await Promise.all([
				store.getRepositoryAccess(organizationName, repositoryName),
				store.getMember(organizationName, targetUserId),
				directory.getUserById(targetUserId),
				store.getRepositoryMember(
					organizationName,
					repositoryName,
					targetUserId,
				),
			]);
			if (!access || !target || !targetUser) {
				throw new NotFoundError("Organization member not found");
			}
			if (access.ownerId === targetUserId) {
				throw new ConflictError("Repository owner access cannot be changed");
			}
			if (target.role !== "member") {
				throw new ConflictError(
					"Organization roles already have repository access",
				);
			}
			if (!canManageRepositoryRole(context, current?.role, nextRole)) {
				throw new ForbiddenError("You cannot assign this repository role");
			}
			await store.setRepositoryMember(
				organizationName,
				repositoryName,
				targetUserId,
				nextRole,
			);
			return toRepositoryMember(targetUser, nextRole);
		},
		async removeRepositoryMember(
			organizationName: string,
			repositoryName: string,
			targetUserId: string,
			userId?: string,
		): Promise<void> {
			requireMembershipManagement();
			const context = await repositoryAccessPolicy.requirePermission(
				organizationName,
				repositoryName,
				userId,
				"manageAccess",
			);
			const [access, current] = await Promise.all([
				store.getRepositoryAccess(organizationName, repositoryName),
				store.getRepositoryMember(
					organizationName,
					repositoryName,
					targetUserId,
				),
			]);
			if (!access || !current) {
				throw new NotFoundError("Repository member not found");
			}
			if (access.ownerId === targetUserId) {
				throw new ConflictError("Repository owner access cannot be removed");
			}
			if (!canManageRepositoryRole(context, current.role, undefined)) {
				throw new ForbiddenError("You cannot remove this repository role");
			}
			await store.removeRepositoryMember(
				organizationName,
				repositoryName,
				targetUserId,
			);
		},
		getOrganization: getAccessibleOrganization,
		requireOrganization: getAccessibleOrganization,
	};
}
