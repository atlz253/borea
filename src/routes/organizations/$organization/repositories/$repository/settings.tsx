import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserFn } from "#/modules/auth";
import {
	getRepositoryAccessFn,
	listOrganizationMembersFn,
	listRepositoryMembersFn,
} from "#/modules/organizations";
import { RepositorySettingsPage } from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/settings",
)({
	loader: async ({ params }) => {
		const [auth, access] = await Promise.all([
			getCurrentUserFn(),
			getRepositoryAccessFn({
				data: {
					organizationName: params.organization,
					repositoryName: params.repository,
				},
			}),
		]);
		if (auth.authMode !== "full" || !access.canManageAccess) {
			return { access, members: [], repositoryMembers: [] };
		}
		const [members, repositoryMembers] = await Promise.all([
			listOrganizationMembersFn({
				data: { organizationName: params.organization },
			}),
			listRepositoryMembersFn({
				data: {
					organizationName: params.organization,
					repositoryName: params.repository,
				},
			}),
		]);
		return { access, members, repositoryMembers };
	},
	component: RepositorySettingsRoute,
});

function RepositorySettingsRoute() {
	const { organization, repository } = Route.useParams();
	const { access, members, repositoryMembers } = Route.useLoaderData();
	return (
		<RepositorySettingsPage
			access={access}
			members={members}
			organizationName={organization}
			name={repository}
			repositoryMembers={repositoryMembers}
		/>
	);
}
