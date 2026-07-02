import { ForbiddenError, NotFoundError } from "#/platform/errors";
import {
	hasRepositoryPermission,
	type RepositoryAccessContext,
	type RepositoryPermission,
} from "./access-control";
import type { RepositoryAccessSummary } from "./access-control.types";
import type { OrganizationStore } from "./organization.store";
import type { Organization, OrganizationRole } from "./schemas";

interface RepositoryAccessPolicyDependencies {
	store: OrganizationStore;
	bypassAccess: boolean;
	getAccessibleOrganization(
		name: string,
		userId?: string,
	): Promise<Organization>;
	getEffectiveRole(
		organization: Organization,
		userId: string,
	): Promise<OrganizationRole | undefined>;
}

export function createRepositoryAccessPolicy({
	store,
	bypassAccess,
	getAccessibleOrganization,
	getEffectiveRole,
}: RepositoryAccessPolicyDependencies) {
	async function getContext(
		organizationName: string,
		repositoryName: string,
		userId?: string,
	): Promise<{
		access: Awaited<ReturnType<OrganizationStore["getRepositoryAccess"]>>;
		context: RepositoryAccessContext;
	}> {
		const organization = await getAccessibleOrganization(
			organizationName,
			userId,
		);
		const access = await store.getRepositoryAccess(
			organizationName,
			repositoryName,
		);
		if (bypassAccess) {
			return {
				access,
				context: { isRepositoryOwner: access?.ownerId === userId },
			};
		}
		if (!access || !userId) {
			throw new NotFoundError(`Repository "${repositoryName}" not found`);
		}
		const [organizationRole, repositoryMember] = await Promise.all([
			getEffectiveRole(organization, userId),
			store.getRepositoryMember(organizationName, repositoryName, userId),
		]);
		return {
			access,
			context: {
				organizationRole,
				repositoryRole: repositoryMember?.role,
				isRepositoryOwner: access.ownerId === userId,
			},
		};
	}

	async function requirePermission(
		organizationName: string,
		repositoryName: string,
		userId: string | undefined,
		permission: RepositoryPermission,
	): Promise<RepositoryAccessContext> {
		const { context } = await getContext(
			organizationName,
			repositoryName,
			userId,
		);
		if (bypassAccess) {
			return context;
		}
		if (!hasRepositoryPermission(context, "read")) {
			throw new NotFoundError(`Repository "${repositoryName}" not found`);
		}
		if (!hasRepositoryPermission(context, permission)) {
			throw new ForbiddenError(
				`You do not have ${permission} permission for this repository`,
			);
		}
		return context;
	}

	async function canRead(
		organizationName: string,
		repositoryName: string,
		userId?: string,
	): Promise<boolean> {
		try {
			const { context } = await getContext(
				organizationName,
				repositoryName,
				userId,
			);
			return bypassAccess || hasRepositoryPermission(context, "read");
		} catch {
			return false;
		}
	}

	async function getSummary(
		organizationName: string,
		repositoryName: string,
		userId?: string,
	): Promise<RepositoryAccessSummary> {
		const { access, context } = await getContext(
			organizationName,
			repositoryName,
			userId,
		);
		if (!bypassAccess && !hasRepositoryPermission(context, "read")) {
			throw new NotFoundError(`Repository "${repositoryName}" not found`);
		}
		return {
			ownerId: access?.ownerId,
			role: context.repositoryRole,
			isOwner: context.isRepositoryOwner,
			canRead: bypassAccess || hasRepositoryPermission(context, "read"),
			canWrite: bypassAccess || hasRepositoryPermission(context, "write"),
			canManageAccess:
				!bypassAccess && hasRepositoryPermission(context, "manageAccess"),
			canAssignRepositoryModerator:
				!bypassAccess &&
				(context.isRepositoryOwner ||
					context.organizationRole === "owner" ||
					context.organizationRole === "administrator" ||
					context.organizationRole === "moderator"),
			canDelete:
				bypassAccess || hasRepositoryPermission(context, "delete"),
		};
	}

	return { canRead, getSummary, requirePermission };
}
