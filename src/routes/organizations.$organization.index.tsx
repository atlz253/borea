import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserFn } from "#/modules/auth";
import {
	getOrganizationFn,
	listOrganizationMembersFn,
	OrganizationPage,
} from "#/modules/organizations";
import { listRepositoriesFn, RepositoriesPage } from "#/modules/repositories";

export const Route = createFileRoute("/organizations/$organization/")({
	loader: async ({ params }) => {
		const auth = await getCurrentUserFn();
		const [organization, repositories, members] = await Promise.all([
			getOrganizationFn({
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
			repositories,
			members,
			membershipEnabled: auth.authMode === "full",
		};
	},
	component: () => {
		const { organization, repositories, members, membershipEnabled } =
			Route.useLoaderData();
		return (
			<OrganizationPage
				organizationName={organization.name}
				members={members}
				membershipEnabled={membershipEnabled}
			>
				<RepositoriesPage
					organizationName={organization.name}
					repositories={repositories}
				/>
			</OrganizationPage>
		);
	},
});
