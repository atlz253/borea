import { afterEach, describe, expect, it } from "vitest";
import {
	createOrganizationService,
	PrismaOrganizationStore,
} from "#/modules/organizations";
import { NotFoundError } from "#/platform/errors";
import { cleanupAllTestDatabases, createTestDatabase } from "#/test-db";
import { seedNoAuthUser } from "./helpers";

describe("auth and permission integration", () => {
	afterEach(() => {
		cleanupAllTestDatabases();
	});

	it("bypassAccess allows all operations without auth", async () => {
		const db = createTestDatabase();
		await seedNoAuthUser(db);
		const store = new PrismaOrganizationStore(db);
		const service = createOrganizationService(store, "single", true);

		const org = await service.getOrganization("default");
		expect(org.name).toBe("default");

		const access = await service.createRepositoryAccess(
			"default",
			"test-repo",
			"00000000-0000-4000-8000-000000000000",
		);
		expect(access.ownerId).toBe("00000000-0000-4000-8000-000000000000");
	});

	it("full mode enforces permissions for authorized users", async () => {
		const db = createTestDatabase();
		const c = db.getClient();
		const now = new Date().toISOString();

		await c.user.create({
			data: {
				id: "user-1",
				name: "User 1",
				email: "user1@test.com",
				createdAt: now,
				credential: "",
			},
		});

		const fullModeUsers = {
			async getUserByEmail(email: string) {
				return email === "user1@test.com"
					? { id: "user-1", name: "User 1", email, createdAt: now }
					: undefined;
			},
			async getUserById(id: string) {
				return id === "user-1"
					? {
							id: "user-1",
							name: "User 1",
							email: "user1@test.com",
							createdAt: now,
						}
					: undefined;
			},
		};

		const store = new PrismaOrganizationStore(db);
		const service = createOrganizationService(
			store,
			"multi",
			false,
			fullModeUsers,
		);

		const org = await service.createOrganization(
			{ name: "My Org", description: "Test" },
			"user-1",
		);
		expect(org.name).toBe("My Org");

		await service.createRepositoryAccess("My Org", "some-repo", "user-1");
	});

	it("throws error for non-member trying to access org in full mode", async () => {
		const db = createTestDatabase();
		const c = db.getClient();
		const now = new Date().toISOString();

		await c.user.create({
			data: {
				id: "owner-1",
				name: "Owner",
				email: "owner@test.com",
				createdAt: now,
				credential: "",
			},
		});
		await c.user.create({
			data: {
				id: "outsider",
				name: "Outsider",
				email: "outsider@test.com",
				createdAt: now,
				credential: "",
			},
		});

		const users = {
			async getUserByEmail(email: string) {
				return email === "owner@test.com"
					? { id: "owner-1", name: "Owner", email, createdAt: now }
					: email === "outsider@test.com"
						? { id: "outsider", name: "Outsider", email, createdAt: now }
						: undefined;
			},
			async getUserById(id: string) {
				return id === "owner-1"
					? {
							id: "owner-1",
							name: "Owner",
							email: "owner@test.com",
							createdAt: now,
						}
					: id === "outsider"
						? {
								id: "outsider",
								name: "Outsider",
								email: "outsider@test.com",
								createdAt: now,
							}
						: undefined;
			},
		};

		const store = new PrismaOrganizationStore(db);
		const service = createOrganizationService(store, "multi", false, users);

		await service.createOrganization(
			{ name: "Private Org", description: "" },
			"owner-1",
		);

		await expect(
			service.createRepositoryAccess("Private Org", "private-repo", "outsider"),
		).rejects.toThrow(NotFoundError);
	});
});
