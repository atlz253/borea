import type { OrganizationRole, RepositoryRole } from "./schemas";

export type OrganizationPermission =
	| "read"
	| "inviteMembers"
	| "manageMemberRoles"
	| "removeMembers"
	| "manageSettings"
	| "createRepository"
	| "deleteRepository"
	| "manageRepositoryAccess"
	| "manageTasks"
	| "deleteOrganization";

export type RepositoryPermission = "read" | "write" | "manageAccess" | "delete";

export interface RepositoryAccessContext {
	organizationRole?: OrganizationRole;
	repositoryRole?: RepositoryRole;
	isRepositoryOwner: boolean;
}

const organizationPermissions: Record<
	OrganizationRole,
	ReadonlySet<OrganizationPermission>
> = {
	owner: new Set([
		"read",
		"inviteMembers",
		"manageMemberRoles",
		"removeMembers",
		"manageSettings",
		"createRepository",
		"deleteRepository",
		"manageRepositoryAccess",
		"manageTasks",
		"deleteOrganization",
	]),
	administrator: new Set([
		"read",
		"inviteMembers",
		"manageMemberRoles",
		"removeMembers",
		"manageSettings",
		"createRepository",
		"deleteRepository",
		"manageRepositoryAccess",
		"manageTasks",
	]),
	moderator: new Set([
		"read",
		"inviteMembers",
		"removeMembers",
		"createRepository",
		"deleteRepository",
		"manageRepositoryAccess",
		"manageTasks",
	]),
	member: new Set(["read"]),
};

const repositoryPermissions: Record<
	RepositoryRole,
	ReadonlySet<RepositoryPermission>
> = {
	read: new Set(["read"]),
	write: new Set(["read", "write"]),
	moderator: new Set(["read", "write", "manageAccess"]),
};

const organizationRoleRank: Record<OrganizationRole, number> = {
	member: 0,
	moderator: 1,
	administrator: 2,
	owner: 3,
};

export function hasOrganizationPermission(
	role: OrganizationRole,
	permission: OrganizationPermission,
): boolean {
	return organizationPermissions[role].has(permission);
}

export function hasRepositoryPermission(
	context: RepositoryAccessContext,
	permission: RepositoryPermission,
): boolean {
	if (
		context.isRepositoryOwner ||
		context.organizationRole === "owner" ||
		context.organizationRole === "administrator" ||
		context.organizationRole === "moderator"
	) {
		return true;
	}
	return context.repositoryRole
		? repositoryPermissions[context.repositoryRole].has(permission)
		: false;
}

export function canAssignOrganizationRole(
	actorRole: OrganizationRole,
	targetRole: OrganizationRole,
	nextRole: OrganizationRole,
	isSelf: boolean,
): boolean {
	if (actorRole === "owner") {
		if (isSelf) {
			return nextRole === "owner";
		}
		return targetRole !== "owner";
	}
	if (actorRole !== "administrator" || isSelf) {
		return false;
	}
	return (
		targetRole !== "owner" &&
		targetRole !== "administrator" &&
		(nextRole === "member" || nextRole === "moderator")
	);
}

export function canRemoveOrganizationMember(
	actorRole: OrganizationRole,
	targetRole: OrganizationRole,
	isSelf: boolean,
): boolean {
	if (isSelf || targetRole === "owner") {
		return false;
	}
	return organizationRoleRank[actorRole] > organizationRoleRank[targetRole];
}

export function canManageRepositoryRole(
	context: RepositoryAccessContext,
	currentRole: RepositoryRole | undefined,
	nextRole: RepositoryRole | undefined,
): boolean {
	if (
		context.organizationRole === "owner" ||
		context.organizationRole === "administrator" ||
		context.organizationRole === "moderator" ||
		context.isRepositoryOwner
	) {
		return true;
	}
	if (context.repositoryRole !== "moderator" || currentRole === "moderator") {
		return false;
	}
	return nextRole === undefined || nextRole === "read" || nextRole === "write";
}
