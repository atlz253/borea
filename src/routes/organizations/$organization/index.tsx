import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserFn } from "#/modules/auth";
import {
	getOrganizationAccessFn,
	getOrganizationFn,
	listOrganizationMembersFn,
	OrganizationPage,
} from "#/modules/organizations";
import { listRepositoriesFn, RepositoriesPage } from "#/modules/repositories";

export const Route = createFileRoute("/organizations/$organization/")({
	loader: async ({ params }) => {
		const auth = await getCurrentUserFn();
		const [organization, access, repositories, members] = await Promise.all([
			getOrganizationFn({
				data: { organizationName: params.organization },
			}),
			getOrganizationAccessFn({
				data: { organizationName: params.organization },
			}),
			listRepositoriesFn({
				data: { organizationName: params.organization },
			}),
			auth.authMode === "full"
				? listOrganizationMembersFn({
						data: { organizationName: params.organization },
					})
				: Promise.resolve([]),
		]);
		return {
			organization,
			access,
			repositories,
			members,
			membershipEnabled: auth.authMode === "full",
		};
	},
	component: () => {
		const { organization, access, repositories, members, membershipEnabled } =
			Route.useLoaderData();
		return (
			<OrganizationPage
				access={access}
				description={organization.description}
				organizationName={organization.name}
				members={members}
				membershipEnabled={membershipEnabled}
			>
				<RepositoriesPage
					canCreate={access.canCreateRepository}
					organizationName={organization.name}
					repositories={repositories}
				/>
			</OrganizationPage>
		);
	},
});
