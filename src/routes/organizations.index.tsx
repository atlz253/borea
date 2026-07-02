import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	DEFAULT_ORGANIZATION_NAME,
	getOrganizationModeFn,
	listOrganizationsFn,
	OrganizationsPage,
} from "#/modules/organizations";

export const Route = createFileRoute("/organizations/")({
	loader: async () => {
		const mode = await getOrganizationModeFn();
		if (mode === "single") {
			throw redirect({
				to: "/organizations/$organization",
				params: { organization: DEFAULT_ORGANIZATION_NAME },
			});
		}
		return listOrganizationsFn();
	},
	component: () => <OrganizationsPage organizations={Route.useLoaderData()} />,
});
