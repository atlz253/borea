import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	createRepositoryFn,
	listUserRepositoriesFn,
	repoNameSchema,
} from "#/modules/repositories";
import { handleApiRequest, parseJsonBody } from "#/platform/http";

const MAX_REPOSITORY_DESCRIPTION_LENGTH = 500;

const createUserRepositoryBodySchema = z.object({
	name: repoNameSchema,
	description: z
		.string()
		.trim()
		.max(MAX_REPOSITORY_DESCRIPTION_LENGTH)
		.optional()
		.default(""),
});

export const Route = createFileRoute("/api/v1/users/$username/repositories")({
	server: {
		handlers: {
			GET: async ({ params }) =>
				handleApiRequest(async () =>
					Response.json(
						await listUserRepositoriesFn({
							data: { userName: params.username },
						}),
					),
				),
			POST: async ({ params, request }) => {
				return handleApiRequest(async () => {
					const body = await parseJsonBody(
						request,
						createUserRepositoryBodySchema,
					);
					return Response.json(
						await createRepositoryFn({
							data: { ...body, userName: params.username },
						}),
						{ status: 201 },
					);
				});
			},
		},
	},
	component: () => null,
});
