import { createFileRoute } from "@tanstack/react-router";
import { revokeGitTokenFn } from "#/modules/auth";
import { handleApiRequest } from "#/platform/http";

export const Route = createFileRoute("/api/v1/auth/git-tokens/$tokenId")({
	server: {
		handlers: {
			DELETE: async ({ params }) =>
				handleApiRequest(async () => {
					await revokeGitTokenFn({ data: { tokenId: params.tokenId } });
					return new Response(null, { status: 204 });
				}),
		},
	},
	component: () => null,
});
