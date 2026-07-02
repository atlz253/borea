import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "#/platform/errors";
import {
	createOrganizationService,
	DEFAULT_ORGANIZATION_NAME,
} from "./organization.service";
import { FileSystemOrganizationStore } from "./organization.store";
import { organizationNameSchema } from "./schemas";

const directories: string[] = [];

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
	const ownerId = "00000000-0000-4000-8000-000000000001";
	const otherOwnerId = "00000000-0000-4000-8000-000000000002";

	it("validates organization names", () => {
		expect(organizationNameSchema.parse("team-1")).toBe("team-1");
		expect(() => organizationNameSchema.parse("Team")).toThrow();
		expect(() => organizationNameSchema.parse(".hidden")).toThrow();
		expect(() => organizationNameSchema.parse("..")).toThrow();
	});

	it("creates, lists, and gets organizations", async () => {
		const service = createOrganizationService(await createStore(), "multi");
		const created = await service.createOrganization(
			{
				name: "team",
				description: "Team",
			},
			ownerId,
		);

		expect(created.name).toBe("team");
		expect(created).not.toHaveProperty("ownerId");
		await expect(
			service.getOrganization("team", ownerId),
		).resolves.toMatchObject({
			name: "team",
			description: "Team",
		});
		await expect(service.listOrganizations(ownerId)).resolves.toHaveLength(1);
	});

	it("rejects duplicate organizations", async () => {
		const service = createOrganizationService(await createStore(), "multi");
		await service.createOrganization(
			{ name: "team", description: "" },
			ownerId,
		);
		await expect(
			service.createOrganization({ name: "team", description: "" }, ownerId),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("exposes only organizations owned by the current user", async () => {
		const service = createOrganizationService(await createStore(), "multi");
		await service.createOrganization(
			{ name: "first", description: "" },
			ownerId,
		);
		await service.createOrganization(
			{ name: "second", description: "" },
			otherOwnerId,
		);

		await expect(service.listOrganizations(ownerId)).resolves.toMatchObject([
			{ name: "first" },
		]);
		await expect(
			service.getOrganization("second", ownerId),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("hides ownerless organizations unless ownership is bypassed", async () => {
		const store = await createStore();
		await store.create({ name: "legacy" });
		const fullService = createOrganizationService(store, "multi");
		const noAuthService = createOrganizationService(store, "multi", true);

		await expect(fullService.listOrganizations(ownerId)).resolves.toEqual([]);
		await expect(noAuthService.listOrganizations()).resolves.toMatchObject([
			{ name: "legacy" },
		]);
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
