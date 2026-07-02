import type { User } from "#/modules/auth";
import type {
	OrganizationMember,
	OrganizationRole,
	RepositoryMember,
	RepositoryRole,
} from "./schemas";

export interface OrganizationAccessSummary {
	role?: OrganizationRole;
	canInviteMembers: boolean;
	canManageMemberRoles: boolean;
	canRemoveMembers: boolean;
	canManageSettings: boolean;
	canCreateRepository: boolean;
	canDeleteOrganization: boolean;
}

export interface RepositoryAccessSummary {
	ownerId?: string;
	role?: RepositoryRole;
	isOwner: boolean;
	canRead: boolean;
	canWrite: boolean;
	canManageAccess: boolean;
	canAssignRepositoryModerator: boolean;
	canDelete: boolean;
}

export function toOrganizationMember(
	user: User,
	role: OrganizationRole,
): OrganizationMember {
	return { ...user, role };
}

export function toRepositoryMember(
	user: User,
	role: RepositoryRole,
): RepositoryMember {
	return { ...user, role };
}
