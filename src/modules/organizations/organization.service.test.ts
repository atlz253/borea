import { afterEach, describe, expect, it } from "vitest";
import type { User } from "#/modules/auth";
import { ConflictError } from "#/platform/errors";
import { cleanupAllTestDatabases, createTestDatabase } from "#/test-db";
import { createOrganizationService } from "./organization.service";
import { PrismaOrganizationStore } from "./prisma-organization.store";

const owner = createUser("00000000-0000-4000-8000-000000000001", "Owner");
const member = createUser("00000000-0000-4000-8000-000000000004", "Member");

function createUser(id: string, name: string): User {
	return {
		id,
		name,
		email: `${name.toLowerCase()}@test.com`,
		createdAt: new Date().toISOString(),
	};
}

function createUsers() {
	return {
		async getUserByEmail(email: string) {
			return [owner, member].find((u) => u.email === email);
		},
		async getUserById(id: string) {
			return [owner, member].find((u) => u.id === id);
		},
	};
}

async function seedUsers(): Promise<ReturnType<typeof createTestDatabase>> {
	const db = createTestDatabase();
	const c = db.getClient();
	const now = new Date().toISOString();
	for (const u of [owner, member]) {
		await c.user.create({
			data: {
				id: u.id,
				name: u.name,
				email: u.email,
				createdAt: now,
				credential: "{}",
			},
		});
	}
	return db;
}

function makeService(db: ReturnType<typeof createTestDatabase>) {
	const store = new PrismaOrganizationStore(db);
	return createOrganizationService(store, "multi", false, createUsers());
}

afterEach(() => {
	cleanupAllTestDatabases();
});

describe("createOrganizationService", () => {
	it("creates an organization", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		const org = await service.createOrganization(
			{ name: "my-org", description: "" },
			owner.id,
		);
		expect(org.name).toBe("my-org");
		expect(org.createdAt).toBeInstanceOf(Date);
	});

	it("refuses duplicate organization name", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		await service.createOrganization(
			{ name: "my-org", description: "" },
			owner.id,
		);
		await expect(
			service.createOrganization({ name: "my-org", description: "" }, owner.id),
		).rejects.toThrow(ConflictError);
	});

	it("lists organizations", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		await service.createOrganization(
			{ name: "org-a", description: "" },
			owner.id,
		);
		await service.createOrganization(
			{ name: "org-b", description: "" },
			owner.id,
		);
		const orgs = await service.listOrganizations(owner.id);
		expect(orgs).toHaveLength(2);
	});

	it("adds owner as member on create", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		await service.createOrganization(
			{ name: "my-org", description: "" },
			owner.id,
		);
		const members = await service.listOrganizationMembers("my-org", owner.id);
		expect(members).toHaveLength(1);
		expect(members[0].role).toBe("owner");
	});

	it("invites an existing user as member", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		await service.createOrganization(
			{ name: "my-org", description: "" },
			owner.id,
		);
		const invited = await service.inviteOrganizationMember(
			"my-org",
			{ email: member.email },
			owner.id,
		);
		expect(invited.role).toBe("member");
		const members = await service.listOrganizationMembers("my-org", owner.id);
		expect(members).toHaveLength(2);
	});

	it("updates organization description", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		await service.createOrganization(
			{ name: "my-org", description: "" },
			owner.id,
		);
		await service.updateOrganization(
			"my-org",
			{ description: "Updated description" },
			owner.id,
		);
		const org = await service.getOrganization("my-org", owner.id);
		expect(org?.description).toBe("Updated description");
	});

	it("deletes organization", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		await service.createOrganization(
			{ name: "my-org", description: "" },
			owner.id,
		);
		await service.deleteOrganizationMetadata("my-org", owner.id);
		await expect(service.getOrganization("my-org", owner.id)).rejects.toThrow();
	});

	it("requires authentication to create organizations", async () => {
		const db = await seedUsers();
		const service = makeService(db);
		await expect(
			service.createOrganization({ name: "no-auth", description: "" }),
		).rejects.toThrow(ConflictError);
	});
});
