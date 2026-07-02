import { describe, expect, it } from "vitest";
import {
	canAssignOrganizationRole,
	canManageRepositoryRole,
	canRemoveOrganizationMember,
	hasOrganizationPermission,
	hasRepositoryPermission,
} from "./access-control";
import { organizationRoleSchema, repositoryRoleSchema } from "./schemas";

describe("organization access policy", () => {
	it("accepts only lowercase role values", () => {
		expect(organizationRoleSchema.parse("administrator")).toBe(
			"administrator",
		);
		expect(repositoryRoleSchema.parse("write")).toBe("write");
		expect(() => organizationRoleSchema.parse("OWNER")).toThrow();
		expect(() => repositoryRoleSchema.parse("READ")).toThrow();
	});

	it.each([
		["owner", "deleteOrganization", true],
		["administrator", "manageSettings", true],
		["administrator", "deleteOrganization", false],
		["moderator", "createRepository", true],
		["moderator", "manageSettings", false],
		["member", "read", true],
		["member", "createRepository", false],
	] as const)("%s %s is %s", (role, permission, expected) => {
		expect(hasOrganizationPermission(role, permission)).toBe(expected);
	});

	it("enforces organization role assignment hierarchy", () => {
		expect(
			canAssignOrganizationRole("owner", "member", "administrator", false),
		).toBe(true);
		expect(
			canAssignOrganizationRole("administrator", "member", "moderator", false),
		).toBe(true);
		expect(
			canAssignOrganizationRole(
				"administrator",
				"member",
				"administrator",
				false,
			),
		).toBe(false);
		expect(
			canAssignOrganizationRole("moderator", "member", "moderator", false),
		).toBe(false);
		expect(canAssignOrganizationRole("owner", "owner", "member", true)).toBe(
			false,
		);
	});

	it("enforces organization removal hierarchy", () => {
		expect(canRemoveOrganizationMember("owner", "administrator", false)).toBe(
			true,
		);
		expect(
			canRemoveOrganizationMember("administrator", "moderator", false),
		).toBe(true);
		expect(canRemoveOrganizationMember("moderator", "member", false)).toBe(
			true,
		);
		expect(canRemoveOrganizationMember("moderator", "moderator", false)).toBe(
			false,
		);
		expect(canRemoveOrganizationMember("owner", "owner", true)).toBe(false);
	});
});

describe("repository access policy", () => {
	it.each([
		["read", "read", true],
		["read", "write", false],
		["write", "write", true],
		["write", "manageAccess", false],
		["moderator", "manageAccess", true],
		["moderator", "delete", false],
	] as const)("%s %s is %s", (role, permission, expected) => {
		expect(
			hasRepositoryPermission(
				{ repositoryRole: role, isRepositoryOwner: false },
				permission,
			),
		).toBe(expected);
	});

	it("gives repository owners and privileged organization roles full access", () => {
		expect(hasRepositoryPermission({ isRepositoryOwner: true }, "delete")).toBe(
			true,
		);
		expect(
			hasRepositoryPermission(
				{ organizationRole: "moderator", isRepositoryOwner: false },
				"delete",
			),
		).toBe(true);
	});

	it("limits repository moderators to read and write grants", () => {
		const moderator = {
			repositoryRole: "moderator" as const,
			isRepositoryOwner: false,
		};
		expect(canManageRepositoryRole(moderator, undefined, "write")).toBe(true);
		expect(canManageRepositoryRole(moderator, undefined, "moderator")).toBe(
			false,
		);
		expect(canManageRepositoryRole(moderator, "moderator", undefined)).toBe(
			false,
		);
	});
});
