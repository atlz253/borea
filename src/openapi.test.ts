import { describe, expect, it } from "vitest";
import { generateOpenApiDocument } from "./openapi";

describe("generateOpenApiDocument", () => {
	it("generates the documented REST API paths", () => {
		const document = generateOpenApiDocument();
		const paths = document.paths ?? {};

		expect(document.openapi).toBe("3.1.0");
		expect(Object.keys(paths)).toEqual(
			expect.arrayContaining([
				"/api/v1/repositories",
				"/api/v1/repositories/{name}",
				"/api/v1/repositories/{name}/pull-requests",
				"/api/v1/repositories/{name}/pull-requests/{pullId}",
				"/api/v1/repositories/{name}/pull-requests/{pullId}/merge",
			]),
		);
		expect(
			paths["/api/v1/repositories/{name}/pull-requests/{pullId}/merge"]?.post,
		).toBeDefined();
	});
});
