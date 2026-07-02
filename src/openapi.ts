import {
	OpenAPIRegistry,
	OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { registerOrganizationOpenApi } from "#/modules/organizations";
import { registerPullRequestOpenApi } from "#/modules/pull-requests";
import { registerRepositoryOpenApi } from "#/modules/repositories";

export function generateOpenApiDocument() {
	const registry = new OpenAPIRegistry();
	registerOrganizationOpenApi(registry);
	registerRepositoryOpenApi(registry);
	registerPullRequestOpenApi(registry);

	return new OpenApiGeneratorV31(registry.definitions).generateDocument({
		openapi: "3.1.0",
		info: {
			title: "Nirvana REST API",
			version: "1.0.0",
			description:
				"Public REST API for Nirvana repositories and pull requests.",
		},
	});
}
