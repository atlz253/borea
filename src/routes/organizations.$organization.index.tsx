import { createFileRoute } from "@tanstack/react-router";
import { getOrganizationFn } from "#/modules/organizations";
import { listRepositoriesFn, RepositoriesPage } from "#/modules/repositories";

export const Route = createFileRoute("/organizations/$organization/")({
	loader: async ({ params }) => {
		const organization = await getOrganizationFn({
			data: { organizationName: params.organization },
		});
		const repositories = await listRepositoriesFn({
			data: { organizationName: params.organization },
		});
		return { organization, repositories };
	},
	component: () => {
		const { organization, repositories } = Route.useLoaderData();
		return (
			<RepositoriesPage
				organizationName={organization.name}
				repositories={repositories}
			/>
		);
	},
});
