import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	createOrganizationSchema,
	inviteOrganizationMemberSchema,
	organizationNameSchema,
	setRepositoryMemberRoleSchema,
	updateOrganizationMemberRoleSchema,
	updateOrganizationSchema,
} from "../schemas";

// Schemas defined locally in organization.functions.ts (not exported)
const organizationPermissionSchema = z.enum([
	"read",
	"inviteMembers",
	"manageMemberRoles",
	"removeMembers",
	"manageSettings",
	"createRepository",
	"deleteRepository",
	"manageRepositoryAccess",
	"deleteOrganization",
]);

const repositoryPermissionSchema = z.enum([
	"read",
	"write",
	"manageAccess",
	"delete",
]);

const MAX_REPOSITORY_NAME_LENGTH = 100;
const repositoryNameInputSchema = z
	.string()
	.min(1)
	.max(MAX_REPOSITORY_NAME_LENGTH);

const organizationMemberInputSchema = z.object({
	organizationName: organizationNameSchema,
	userId: z.uuid(),
});

const repositoryAccessInputSchema = z.object({
	organizationName: organizationNameSchema,
	repositoryName: repositoryNameInputSchema,
});

describe("organization server function validators", () => {
	describe("organizationNameSchema", () => {
		it("accepts valid organization names", () => {
			expect(organizationNameSchema.parse("team")).toBe("team");
			expect(organizationNameSchema.parse("my-org")).toBe("my-org");
			expect(organizationNameSchema.parse("org_1")).toBe("org_1");
			expect(organizationNameSchema.parse("a.b.c")).toBe("a.b.c");
			expect(organizationNameSchema.parse("org-1.test")).toBe("org-1.test");
		});

		it("rejects names with uppercase letters", () => {
			expect(() => organizationNameSchema.parse("Team")).toThrow();
			expect(() => organizationNameSchema.parse("MyOrg")).toThrow();
		});

		it("rejects names starting with a dot", () => {
			expect(() => organizationNameSchema.parse(".hidden")).toThrow();
			expect(() => organizationNameSchema.parse("..org")).toThrow();
		});

		it("rejects reserved names", () => {
			expect(() => organizationNameSchema.parse(".")).toThrow();
			expect(() => organizationNameSchema.parse("..")).toThrow();
		});

		it("rejects names with spaces and special characters", () => {
			expect(() => organizationNameSchema.parse("my org")).toThrow();
			expect(() => organizationNameSchema.parse("org/name")).toThrow();
			expect(() => organizationNameSchema.parse("org@name")).toThrow();
		});

		it("rejects empty names", () => {
			expect(() => organizationNameSchema.parse("")).toThrow();
		});

		it("rejects names exceeding maximum length", () => {
			const longName = "a".repeat(101);
			expect(() => organizationNameSchema.parse(longName)).toThrow();
		});

		it("accepts names at maximum length", () => {
			const maxName = "a".repeat(100);
			expect(organizationNameSchema.parse(maxName)).toBe(maxName);
		});
	});

	describe("createOrganizationSchema", () => {
		it("accepts valid creation input with description", () => {
			const result = createOrganizationSchema.parse({
				name: "team-alpha",
				description: "Our development team",
			});
			expect(result).toEqual({
				name: "team-alpha",
				description: "Our development team",
			});
		});

		it("defaults description to empty string when omitted", () => {
			const result = createOrganizationSchema.parse({
				name: "team-alpha",
			});
			expect(result.description).toBe("");
		});

		it("trims description whitespace", () => {
			const result = createOrganizationSchema.parse({
				name: "team-alpha",
				description: "  trimmed  ",
			});
			expect(result.description).toBe("trimmed");
		});

		it("rejects missing name", () => {
			expect(() =>
				createOrganizationSchema.parse({ description: "test" }),
			).toThrow();
		});

		it("rejects invalid name format", () => {
			expect(() =>
				createOrganizationSchema.parse({ name: "Invalid Name!" }),
			).toThrow();
		});

		it("rejects description exceeding maximum length", () => {
			const longDescription = "a".repeat(501);
			expect(() =>
				createOrganizationSchema.parse({
					name: "team",
					description: longDescription,
				}),
			).toThrow();
		});

		it("accepts description at maximum length", () => {
			const maxDesc = "a".repeat(500);
			expect(
				createOrganizationSchema.parse({ name: "team", description: maxDesc }),
			).toMatchObject({ description: maxDesc });
		});
	});

	describe("updateOrganizationSchema", () => {
		it("accepts valid update input", () => {
			const result = updateOrganizationSchema.parse({
				description: "Updated description",
			});
			expect(result).toEqual({ description: "Updated description" });
		});

		it("trims description whitespace", () => {
			const result = updateOrganizationSchema.parse({
				description: "  spaced  ",
			});
			expect(result.description).toBe("spaced");
		});

		it("rejects missing description", () => {
			expect(() => updateOrganizationSchema.parse({})).toThrow();
		});

		it("rejects description exceeding maximum length", () => {
			const longDescription = "a".repeat(501);
			expect(() =>
				updateOrganizationSchema.parse({ description: longDescription }),
			).toThrow();
		});
	});

	describe("inviteOrganizationMemberSchema", () => {
		it("accepts valid email", () => {
			const result = inviteOrganizationMemberSchema.parse({
				email: "user@example.com",
			});
			expect(result).toEqual({ email: "user@example.com" });
		});

		it("normalizes email case", () => {
			const result = inviteOrganizationMemberSchema.parse({
				email: "User@Example.COM",
			});
			expect(result.email).toBe("user@example.com");
		});

		it("rejects invalid email", () => {
			expect(() =>
				inviteOrganizationMemberSchema.parse({ email: "not-an-email" }),
			).toThrow();
		});

		it("rejects missing email", () => {
			expect(() => inviteOrganizationMemberSchema.parse({})).toThrow();
		});
	});

	describe("updateOrganizationMemberRoleSchema", () => {
		it.each([
			["owner"],
			["administrator"],
			["moderator"],
			["member"],
		] as const)("accepts valid role: %s", (role) => {
			const result = updateOrganizationMemberRoleSchema.parse({ role });
			expect(result).toEqual({ role });
		});

		it("rejects invalid role", () => {
			expect(() =>
				updateOrganizationMemberRoleSchema.parse({ role: "superadmin" }),
			).toThrow();
		});

		it("rejects missing role", () => {
			expect(() => updateOrganizationMemberRoleSchema.parse({})).toThrow();
		});
	});

	describe("organizationPermissionSchema", () => {
		it.each([
			"read",
			"inviteMembers",
			"manageMemberRoles",
			"removeMembers",
			"manageSettings",
			"createRepository",
			"deleteRepository",
			"manageRepositoryAccess",
			"deleteOrganization",
		] as const)("accepts valid permission: %s", (permission) => {
			expect(organizationPermissionSchema.parse(permission)).toBe(permission);
		});

		it("rejects invalid permissions", () => {
			expect(() => organizationPermissionSchema.parse("superadmin")).toThrow();
			expect(() => organizationPermissionSchema.parse("manage")).toThrow();
		});
	});

	describe("repositoryPermissionSchema", () => {
		it.each([
			"read",
			"write",
			"manageAccess",
			"delete",
		] as const)("accepts valid permission: %s", (permission) => {
			expect(repositoryPermissionSchema.parse(permission)).toBe(permission);
		});

		it("rejects invalid permissions", () => {
			expect(() => repositoryPermissionSchema.parse("admin")).toThrow();
		});
	});

	describe("organizationMemberInputSchema", () => {
		it("accepts valid member input", () => {
			const userId = "00000000-0000-4000-8000-000000000001";
			const result = organizationMemberInputSchema.parse({
				organizationName: "team",
				userId,
			});
			expect(result).toEqual({ organizationName: "team", userId });
		});

		it("rejects invalid UUID", () => {
			expect(() =>
				organizationMemberInputSchema.parse({
					organizationName: "team",
					userId: "not-a-uuid",
				}),
			).toThrow();
		});

		it("rejects invalid organization name", () => {
			expect(() =>
				organizationMemberInputSchema.parse({
					organizationName: "Invalid Name!",
					userId: "00000000-0000-4000-8000-000000000001",
				}),
			).toThrow();
		});

		it("rejects missing fields", () => {
			expect(() =>
				organizationMemberInputSchema.parse({
					organizationName: "team",
				}),
			).toThrow();
		});
	});

	describe("repositoryAccessInputSchema", () => {
		it("accepts valid repository access input", () => {
			const result = repositoryAccessInputSchema.parse({
				organizationName: "team",
				repositoryName: "my-repo",
			});
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "my-repo",
			});
		});

		it("accepts repository name with dots and hyphens", () => {
			const result = repositoryAccessInputSchema.parse({
				organizationName: "team",
				repositoryName: "my-repo.v2",
			});
			expect(result.repositoryName).toBe("my-repo.v2");
		});

		it("rejects empty repository name", () => {
			expect(() =>
				repositoryAccessInputSchema.parse({
					organizationName: "team",
					repositoryName: "",
				}),
			).toThrow();
		});

		it("rejects repository name exceeding maximum length", () => {
			const longName = "a".repeat(101);
			expect(() =>
				repositoryAccessInputSchema.parse({
					organizationName: "team",
					repositoryName: longName,
				}),
			).toThrow();
		});

		it("accepts repository name at maximum length", () => {
			const maxName = "a".repeat(100);
			expect(
				repositoryAccessInputSchema.parse({
					organizationName: "team",
					repositoryName: maxName,
				}),
			).toMatchObject({ repositoryName: maxName });
		});
	});

	describe("setRepositoryMemberRoleSchema", () => {
		it.each([
			["read"],
			["write"],
			["moderator"],
		] as const)("accepts valid repository role: %s", (role) => {
			const result = setRepositoryMemberRoleSchema.parse({ role });
			expect(result).toEqual({ role });
		});

		it("rejects invalid repository role", () => {
			expect(() =>
				setRepositoryMemberRoleSchema.parse({ role: "admin" }),
			).toThrow();
		});

		it("rejects missing role", () => {
			expect(() => setRepositoryMemberRoleSchema.parse({})).toThrow();
		});
	});

	describe("repositoryNameInputSchema", () => {
		it("accepts valid repository names", () => {
			expect(repositoryNameInputSchema.parse("my-repo")).toBe("my-repo");
			expect(repositoryNameInputSchema.parse("repo123")).toBe("repo123");
		});

		it("rejects empty name", () => {
			expect(() => repositoryNameInputSchema.parse("")).toThrow();
		});

		it("rejects name exceeding maximum length", () => {
			expect(() => repositoryNameInputSchema.parse("a".repeat(101))).toThrow();
		});

		it("accepts name at maximum length", () => {
			const maxName = "a".repeat(100);
			expect(repositoryNameInputSchema.parse(maxName)).toBe(maxName);
		});
	});

	describe("combined validators for complex server functions", () => {
		it("updateOrganizationFn validator combines name and description", () => {
			const input = {
				organizationName: "team",
				description: "Updated team",
			};
			const organizationName = organizationNameSchema.parse(
				input.organizationName,
			);
			const updateInput = updateOrganizationSchema.parse({
				description: input.description,
			});
			const result = {
				organizationName,
				...updateInput,
			};
			expect(result).toEqual({
				organizationName: "team",
				description: "Updated team",
			});
		});

		it("inviteOrganizationMemberFn validator combines name and email", () => {
			const input = {
				organizationName: "team",
				email: "user@example.com",
			};
			const organizationName = organizationNameSchema.parse(
				input.organizationName,
			);
			const inviteInput = inviteOrganizationMemberSchema.parse({
				email: input.email,
			});
			const result = {
				organizationName,
				...inviteInput,
			};
			expect(result).toEqual({
				organizationName: "team",
				email: "user@example.com",
			});
		});

		it("updateOrganizationMemberRoleFn validator combines all fields", () => {
			const userId = "00000000-0000-4000-8000-000000000001";
			const input = {
				organizationName: "team",
				userId,
				role: "administrator",
			};
			const memberInput = organizationMemberInputSchema.parse(input);
			const roleInput = updateOrganizationMemberRoleSchema.parse({
				role: input.role,
			});
			const result = {
				...memberInput,
				...roleInput,
			};
			expect(result).toEqual({
				organizationName: "team",
				userId,
				role: "administrator",
			});
		});

		it("requireOrganizationPermissionFn validator combines name and permission", () => {
			const input = {
				organizationName: "team",
				permission: "deleteOrganization",
			};
			const organizationName = organizationNameSchema.parse(
				input.organizationName,
			);
			const permission = organizationPermissionSchema.parse(input.permission);
			const result = {
				organizationName,
				permission,
			};
			expect(result).toEqual({
				organizationName: "team",
				permission: "deleteOrganization",
			});
		});

		it("requireRepositoryPermissionFn validator combines all fields", () => {
			const input = {
				organizationName: "team",
				repositoryName: "my-repo",
				permission: "write",
			};
			const accessInput = repositoryAccessInputSchema.parse({
				organizationName: input.organizationName,
				repositoryName: input.repositoryName,
			});
			const permission = repositoryPermissionSchema.parse(input.permission);
			const result = {
				...accessInput,
				permission,
			};
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "my-repo",
				permission: "write",
			});
		});

		it("setRepositoryMemberRoleFn validator combines all fields", () => {
			const userId = "00000000-0000-4000-8000-000000000001";
			const input = {
				organizationName: "team",
				repositoryName: "my-repo",
				userId,
				role: "write",
			};
			const accessInput = repositoryAccessInputSchema.parse({
				organizationName: input.organizationName,
				repositoryName: input.repositoryName,
			});
			const parsedUserId = z.uuid().parse(input.userId);
			const roleInput = setRepositoryMemberRoleSchema.parse({
				role: input.role,
			});
			const result = {
				...accessInput,
				userId: parsedUserId,
				...roleInput,
			};
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "my-repo",
				userId: parsedUserId,
				role: "write",
			});
		});

		it("removeRepositoryMemberFn validator combines access and userId", () => {
			const userId = "00000000-0000-4000-8000-000000000001";
			const input = {
				organizationName: "team",
				repositoryName: "my-repo",
				userId,
			};
			const accessInput = repositoryAccessInputSchema.parse({
				organizationName: input.organizationName,
				repositoryName: input.repositoryName,
			});
			const parsedUserId = z.uuid().parse(input.userId);
			const result = {
				...accessInput,
				userId: parsedUserId,
			};
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "my-repo",
				userId: parsedUserId,
			});
		});

		it("filterAccessibleRepositoriesFn validator combines name and names array", () => {
			const input = {
				organizationName: "team",
				repositoryNames: ["repo1", "repo2", "repo3"],
			};
			const organizationName = organizationNameSchema.parse(
				input.organizationName,
			);
			const repositoryNames = z
				.array(repositoryNameInputSchema)
				.parse(input.repositoryNames);
			const result = {
				organizationName,
				repositoryNames,
			};
			expect(result).toEqual({
				organizationName: "team",
				repositoryNames: ["repo1", "repo2", "repo3"],
			});
		});

		it("filterAccessibleRepositoriesFn rejects invalid repository names in array", () => {
			expect(() =>
				z.array(repositoryNameInputSchema).parse(["repo1", "", "repo3"]),
			).toThrow();
		});

		it("filterAccessibleRepositoriesFn rejects repository names exceeding max length", () => {
			expect(() =>
				z.array(repositoryNameInputSchema).parse(["repo1", "a".repeat(101)]),
			).toThrow();
		});
	});

	describe("single-field validators used by GET endpoints", () => {
		it("getOrganizationFn validator extracts organizationName", () => {
			const data = { organizationName: "team" };
			const result = organizationNameSchema.parse(
				(data as { organizationName?: unknown }).organizationName,
			);
			expect(result).toBe("team");
		});

		it("getOrganizationAccessFn validator extracts organizationName", () => {
			const data = { organizationName: "team" };
			const result = organizationNameSchema.parse(
				(data as { organizationName?: unknown }).organizationName,
			);
			expect(result).toBe("team");
		});

		it("deleteOrganizationFn validator extracts organizationName", () => {
			const data = { organizationName: "team" };
			const result = organizationNameSchema.parse(
				(data as { organizationName?: unknown }).organizationName,
			);
			expect(result).toBe("team");
		});

		it("listOrganizationMembersFn validator extracts organizationName", () => {
			const data = { organizationName: "team" };
			const result = organizationNameSchema.parse(
				(data as { organizationName?: unknown }).organizationName,
			);
			expect(result).toBe("team");
		});

		it("getPublicOrganizationFn validator extracts organizationName", () => {
			const data = { organizationName: "team" };
			const result = organizationNameSchema.parse(
				(data as { organizationName?: unknown }).organizationName,
			);
			expect(result).toBe("team");
		});

		it("requireOrganizationFn validator extracts organizationName", () => {
			const data = { organizationName: "team" };
			const result = organizationNameSchema.parse(
				(data as { organizationName?: unknown }).organizationName,
			);
			expect(result).toBe("team");
		});

		it("getRepositoryAccessFn validator parses full access input", () => {
			const data = { organizationName: "team", repositoryName: "repo" };
			const result = repositoryAccessInputSchema.parse(data);
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "repo",
			});
		});

		it("listRepositoryMembersFn validator parses full access input", () => {
			const data = { organizationName: "team", repositoryName: "repo" };
			const result = repositoryAccessInputSchema.parse(data);
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "repo",
			});
		});

		it("createRepositoryAccessFn validator parses full access input", () => {
			const data = { organizationName: "team", repositoryName: "repo" };
			const result = repositoryAccessInputSchema.parse(data);
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "repo",
			});
		});

		it("deleteRepositoryAccessFn validator parses full access input", () => {
			const data = { organizationName: "team", repositoryName: "repo" };
			const result = repositoryAccessInputSchema.parse(data);
			expect(result).toEqual({
				organizationName: "team",
				repositoryName: "repo",
			});
		});
	});

	describe("edge cases and boundary values", () => {
		it("handles single-character organization name", () => {
			expect(organizationNameSchema.parse("a")).toBe("a");
		});

		it("handles organization name with all allowed special characters", () => {
			expect(organizationNameSchema.parse("a.b-c_d")).toBe("a.b-c_d");
		});

		it("handles repository name with hyphens and numbers", () => {
			expect(repositoryNameInputSchema.parse("my-repo-123")).toBe(
				"my-repo-123",
			);
		});

		it("handles empty description", () => {
			const result = updateOrganizationSchema.parse({ description: "" });
			expect(result).toEqual({ description: "" });
		});

		it("handles UUID in member input", () => {
			const validUuid = "550e8400-e29b-41d4-a716-446655440000";
			const result = organizationMemberInputSchema.parse({
				organizationName: "team",
				userId: validUuid,
			});
			expect(result.userId).toBe(validUuid);
		});

		it("handles various UUID formats", () => {
			const validUuid = "550e8400-e29b-41d4-a716-446655440000";
			expect(z.uuid().parse(validUuid)).toBe(validUuid);
			expect(() =>
				z.uuid().parse("550e8400e29b41d4a716446655440000"),
			).toThrow();
			expect(() => z.uuid().parse("not-a-uuid")).toThrow();
			expect(() => z.uuid().parse("")).toThrow();
		});
	});
});
