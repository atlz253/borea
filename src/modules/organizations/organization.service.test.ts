import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { User } from "#/modules/auth";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "#/platform/errors";
import {
	createOrganizationService,
	DEFAULT_ORGANIZATION_NAME,
} from "./organization.service";
import { FileSystemOrganizationStore } from "./organization.store";
import { organizationNameSchema } from "./schemas";

const directories: string[] = [];
const owner = createUser("00000000-0000-4000-8000-000000000001", "Owner");
const administrator = createUser(
	"00000000-0000-4000-8000-000000000002",
	"Administrator",
);
const moderator = createUser(
	"00000000-0000-4000-8000-000000000003",
	"Moderator",
);
const member = createUser("00000000-0000-4000-8000-000000000004", "Member");
const outsider = createUser("00000000-0000-4000-8000-000000000005", "Outsider");
const users = [owner, administrator, moderator, member, outsider];
const userDirectory = {
	async getUserByEmail(email: string) {
		return users.find((user) => user.email === email);
	},
	async getUserById(id: string) {
		return users.find((user) => user.id === id);
	},
};

function createUser(id: string, name: string): User {
	return {
		id,
		name,
		email: `${name.toLowerCase()}@example.com`,
		createdAt: "2026-07-02T00:00:00.000Z",
	};
}

async function createStore(): Promise<FileSystemOrganizationStore> {
	const directory = await mkdtemp(path.join(tmpdir(), "nirvana-org-"));
	directories.push(directory);
	return new FileSystemOrganizationStore(directory);
}

async function createService() {
	const store = await createStore();
	const service = createOrganizationService(
		store,
		"multi",
		false,
		userDirectory,
	);
	await service.createOrganization(
		{ name: "team", description: "Team" },
		owner.id,
	);
	return { service, store };
}

async function inviteAll(
	service: ReturnType<typeof createOrganizationService>,
): Promise<void> {
	for (const user of [administrator, moderator, member]) {
		await service.inviteOrganizationMember(
			"team",
			{ email: user.email },
			owner.id,
		);
	}
}

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("organizations", () => {
	it("validates organization names", () => {
		expect(organizationNameSchema.parse("team-1")).toBe("team-1");
		expect(() => organizationNameSchema.parse("Team")).toThrow();
		expect(() => organizationNameSchema.parse(".hidden")).toThrow();
		expect(() => organizationNameSchema.parse("..")).toThrow();
	});

	it("creates an organization with one owner", async () => {
		const { service, store } = await createService();
		const organization = await service.getOrganization("team", owner.id);

		expect(organization).toMatchObject({
			name: "team",
			ownerId: owner.id,
		});
		await expect(store.listMembers("team")).resolves.toMatchObject([
			{ userId: owner.id, role: "owner" },
		]);
		await expect(
			service.listOrganizationMembers("team", owner.id),
		).resolves.toEqual([{ ...owner, role: "owner" }]);
	});

	it("does not publish an organization when owner validation fails", async () => {
		const store = await createStore();
		const service = createOrganizationService(store, "multi");

		await expect(
			service.createOrganization(
				{ name: "team", description: "" },
				"invalid-user-id",
			),
		).rejects.toThrow();
		await expect(store.get("team")).resolves.toBeUndefined();
	});

	it("invites members with the member role and denies member invitations", async () => {
		const { service } = await createService();

		await expect(
			service.inviteOrganizationMember(
				"team",
				{ email: member.email },
				owner.id,
			),
		).resolves.toEqual({ ...member, role: "member" });
		await expect(
			service.inviteOrganizationMember(
				"team",
				{ email: moderator.email },
				member.id,
			),
		).rejects.toBeInstanceOf(ForbiddenError);
		await expect(
			service.getOrganization("team", member.id),
		).resolves.toMatchObject({ name: "team" });
	});

	it("applies role assignment rules and transfers ownership", async () => {
		const { service } = await createService();
		await inviteAll(service);

		await service.updateOrganizationMemberRole(
			"team",
			administrator.id,
			"administrator",
			owner.id,
		);
		await expect(
			service.updateOrganizationMemberRole(
				"team",
				moderator.id,
				"moderator",
				administrator.id,
			),
		).resolves.toMatchObject({ role: "moderator" });
		await expect(
			service.updateOrganizationMemberRole(
				"team",
				member.id,
				"administrator",
				administrator.id,
			),
		).rejects.toBeInstanceOf(ForbiddenError);

		await service.updateOrganizationMemberRole(
			"team",
			member.id,
			"owner",
			owner.id,
		);
		await expect(
			service.listOrganizationMembers("team", member.id),
		).resolves.toEqual(
			expect.arrayContaining([
				{ ...owner, role: "member" },
				{ ...member, role: "owner" },
			]),
		);
	});

	it("enforces repository roles and moderator grant limits", async () => {
		const { service } = await createService();
		await inviteAll(service);
		await service.createRepositoryAccess("team", "repo", owner.id);

		await expect(
			service.requireRepositoryPermission("team", "repo", member.id, "read"),
		).rejects.toBeInstanceOf(NotFoundError);
		await service.setRepositoryMemberRole(
			"team",
			"repo",
			member.id,
			"read",
			owner.id,
		);
		await expect(
			service.requireRepositoryPermission("team", "repo", member.id, "read"),
		).resolves.toBeDefined();
		await expect(
			service.requireRepositoryPermission("team", "repo", member.id, "write"),
		).rejects.toBeInstanceOf(ForbiddenError);

		await service.setRepositoryMemberRole(
			"team",
			"repo",
			moderator.id,
			"moderator",
			owner.id,
		);
		await expect(
			service.setRepositoryMemberRole(
				"team",
				"repo",
				administrator.id,
				"moderator",
				moderator.id,
			),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("blocks removing repository owners", async () => {
		const { service } = await createService();
		await service.inviteOrganizationMember(
			"team",
			{ email: member.email },
			owner.id,
		);
		await service.updateOrganizationMemberRole(
			"team",
			member.id,
			"moderator",
			owner.id,
		);
		await service.createRepositoryAccess("team", "repo", member.id);

		await expect(
			service.removeOrganizationMember("team", member.id, owner.id),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("hides organizations from outsiders", async () => {
		const { service } = await createService();

		await expect(service.listOrganizations(outsider.id)).resolves.toEqual([]);
		await expect(
			service.getOrganization("team", outsider.id),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("bypasses repository access but disables membership management in NoAuth", async () => {
		const store = await createStore();
		await store.create({ name: "legacy" });
		const service = createOrganizationService(
			store,
			"multi",
			true,
			userDirectory,
		);

		await expect(service.canReadRepository("legacy", "repo")).resolves.toBe(
			true,
		);
		await expect(
			service.listOrganizationMembers("legacy"),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("exposes only the default organization in single mode", async () => {
		const store = await createStore();
		await store.create({ name: "other" });
		const service = createOrganizationService(store, "single", true);

		await expect(service.listOrganizations()).resolves.toMatchObject([
			{ name: DEFAULT_ORGANIZATION_NAME },
		]);
		await expect(service.getOrganization("other")).rejects.toBeInstanceOf(
			NotFoundError,
		);
		await expect(
			service.createOrganization({ name: "new", description: "" }, owner.id),
		).rejects.toBeInstanceOf(ConflictError);
	});
});
