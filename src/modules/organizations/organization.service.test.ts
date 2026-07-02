import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { User } from "#/modules/auth";
import { ConflictError, NotFoundError } from "#/platform/errors";
import {
	createOrganizationService,
	DEFAULT_ORGANIZATION_NAME,
} from "./organization.service";
import { FileSystemOrganizationStore } from "./organization.store";
import { organizationNameSchema } from "./schemas";

const directories: string[] = [];
const owner: User = {
	id: "00000000-0000-4000-8000-000000000001",
	name: "Owner",
	email: "owner@example.com",
	createdAt: "2026-07-02T00:00:00.000Z",
};
const member: User = {
	id: "00000000-0000-4000-8000-000000000002",
	name: "Member",
	email: "member@example.com",
	createdAt: "2026-07-02T00:00:00.000Z",
};
const outsider: User = {
	id: "00000000-0000-4000-8000-000000000003",
	name: "Outsider",
	email: "outsider@example.com",
	createdAt: "2026-07-02T00:00:00.000Z",
};
const users = [owner, member, outsider];
const userDirectory = {
	async getUserByEmail(email: string) {
		return users.find((user) => user.email === email);
	},
	async getUserById(id: string) {
		return users.find((user) => user.id === id);
	},
};

async function createStore(): Promise<FileSystemOrganizationStore> {
	const directory = await mkdtemp(path.join(tmpdir(), "nirvana-org-"));
	directories.push(directory);
	return new FileSystemOrganizationStore(directory);
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

	it("creates an organization with its first member", async () => {
		const store = await createStore();
		const service = createOrganizationService(
			store,
			"multi",
			false,
			userDirectory,
		);
		const created = await service.createOrganization(
			{ name: "team", description: "Team" },
			owner.id,
		);

		expect(created).toMatchObject({ name: "team", description: "Team" });
		await expect(store.listMemberIds("team")).resolves.toEqual([owner.id]);
		await expect(service.getOrganization("team", owner.id)).resolves.toEqual(
			created,
		);
		await expect(service.listOrganizations(owner.id)).resolves.toEqual([
			created,
		]);
		await expect(
			service.listOrganizationMembers("team", owner.id),
		).resolves.toEqual([owner]);
	});

	it("does not leave an organization when first-member creation fails", async () => {
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

	it("rejects duplicate organizations", async () => {
		const service = createOrganizationService(await createStore(), "multi");
		await service.createOrganization(
			{ name: "team", description: "" },
			owner.id,
		);
		await expect(
			service.createOrganization({ name: "team", description: "" }, owner.id),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("invites equal members and grants organization access", async () => {
		const service = createOrganizationService(
			await createStore(),
			"multi",
			false,
			userDirectory,
		);
		await service.createOrganization(
			{ name: "team", description: "" },
			owner.id,
		);

		await expect(
			service.inviteOrganizationMember(
				"team",
				{ email: member.email },
				owner.id,
			),
		).resolves.toEqual(member);
		await expect(
			service.getOrganization("team", member.id),
		).resolves.toMatchObject({ name: "team" });
		await expect(service.listOrganizations(member.id)).resolves.toMatchObject([
			{ name: "team" },
		]);
		await expect(
			service.listOrganizationMembers("team", member.id),
		).resolves.toEqual([owner, member]);
	});

	it("rejects missing and duplicate invitees", async () => {
		const service = createOrganizationService(
			await createStore(),
			"multi",
			false,
			userDirectory,
		);
		await service.createOrganization(
			{ name: "team", description: "" },
			owner.id,
		);

		await expect(
			service.inviteOrganizationMember(
				"team",
				{ email: "missing@example.com" },
				owner.id,
			),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			service.inviteOrganizationMember(
				"team",
				{ email: owner.email },
				owner.id,
			),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("hides organizations and membership operations from outsiders", async () => {
		const service = createOrganizationService(
			await createStore(),
			"multi",
			false,
			userDirectory,
		);
		await service.createOrganization(
			{ name: "team", description: "" },
			owner.id,
		);

		await expect(service.listOrganizations(outsider.id)).resolves.toEqual([]);
		await expect(
			service.getOrganization("team", outsider.id),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			service.listOrganizationMembers("team", outsider.id),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			service.inviteOrganizationMember(
				"team",
				{ email: member.email },
				outsider.id,
			),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("bypasses access but disables membership management in NoAuth", async () => {
		const store = await createStore();
		await store.create({ name: "legacy" });
		const service = createOrganizationService(
			store,
			"multi",
			true,
			userDirectory,
		);

		await expect(service.listOrganizations()).resolves.toMatchObject([
			{ name: "legacy" },
		]);
		await expect(
			service.listOrganizationMembers("legacy"),
		).rejects.toBeInstanceOf(ConflictError);
		await expect(
			service.inviteOrganizationMember(
				"legacy",
				{ email: member.email },
				owner.id,
			),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("exposes only the default organization in single mode", async () => {
		const store = await createStore();
		await store.create({ name: "other" });
		const service = createOrganizationService(store, "single");

		await expect(service.listOrganizations()).resolves.toMatchObject([
			{ name: DEFAULT_ORGANIZATION_NAME },
		]);
		await expect(service.getOrganization("other")).rejects.toBeInstanceOf(
			NotFoundError,
		);
		await expect(
			service.createOrganization({ name: "new", description: "" }),
		).rejects.toBeInstanceOf(ConflictError);
		await expect(store.get("other")).resolves.toBeDefined();
	});

	it("creates the default organization idempotently", async () => {
		const service = createOrganizationService(await createStore(), "single");
		const [first, second] = await Promise.all([
			service.getOrganization(DEFAULT_ORGANIZATION_NAME),
			service.getOrganization(DEFAULT_ORGANIZATION_NAME),
		]);

		expect(first.name).toBe(DEFAULT_ORGANIZATION_NAME);
		expect(second.name).toBe(DEFAULT_ORGANIZATION_NAME);
		await expect(service.listOrganizations()).resolves.toHaveLength(1);
	});
});
