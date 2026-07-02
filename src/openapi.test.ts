import { describe, expect, it } from "vitest";
import { generateOpenApiDocument } from "./openapi";

describe("generateOpenApiDocument", () => {
	it("generates the documented REST API paths", () => {
		const document = generateOpenApiDocument();
		const paths = document.paths ?? {};

		expect(document.openapi).toBe("3.1.0");
		expect(Object.keys(paths)).toEqual(
			expect.arrayContaining([
				"/api/v1/organizations",
				"/api/v1/organizations/{organization}",
				"/api/v1/organizations/{organization}/members",
				"/api/v1/organizations/{organization}/members/{userId}",
				"/api/v1/organizations/{organization}/repositories",
				"/api/v1/organizations/{organization}/repositories/{repository}",
				"/api/v1/organizations/{organization}/repositories/{repository}/members",
				"/api/v1/organizations/{organization}/repositories/{repository}/members/{userId}",
				"/api/v1/organizations/{organization}/repositories/{repository}/pull-requests",
				"/api/v1/organizations/{organization}/repositories/{repository}/pull-requests/{pullId}",
				"/api/v1/organizations/{organization}/repositories/{repository}/pull-requests/{pullId}/merge",
			]),
		);
		expect(
			paths["/api/v1/organizations/{organization}/members"]?.get,
		).toBeDefined();
		expect(
			paths["/api/v1/organizations/{organization}/members"]?.post,
		).toBeDefined();
		expect(
			paths["/api/v1/organizations/{organization}"]?.patch,
		).toBeDefined();
		expect(
			paths["/api/v1/organizations/{organization}"]?.delete,
		).toBeDefined();
		expect(
			paths["/api/v1/organizations/{organization}/members/{userId}"]
				?.patch,
		).toBeDefined();
		expect(
			paths[
				"/api/v1/organizations/{organization}/repositories/{repository}/members/{userId}"
			]?.put,
		).toBeDefined();
		expect(
			paths[
				"/api/v1/organizations/{organization}/repositories/{repository}/pull-requests/{pullId}/merge"
			]?.post,
		).toBeDefined();
	});
});
