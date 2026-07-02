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
	it("validates organization names", () => {
		expect(organizationNameSchema.parse("team-1")).toBe("team-1");
		expect(() => organizationNameSchema.parse("Team")).toThrow();
		expect(() => organizationNameSchema.parse(".hidden")).toThrow();
		expect(() => organizationNameSchema.parse("..")).toThrow();
	});

	it("creates, lists, and gets organizations", async () => {
		const service = createOrganizationService(await createStore(), "multi");
		const created = await service.createOrganization({
			name: "team",
			description: "Team",
		});

		expect(created.name).toBe("team");
		await expect(service.getOrganization("team")).resolves.toMatchObject({
			name: "team",
			description: "Team",
		});
		await expect(service.listOrganizations()).resolves.toHaveLength(1);
	});

	it("rejects duplicate organizations", async () => {
		const service = createOrganizationService(await createStore(), "multi");
		await service.createOrganization({ name: "team", description: "" });
		await expect(
			service.createOrganization({ name: "team", description: "" }),
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
