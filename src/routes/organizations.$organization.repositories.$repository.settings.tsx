import { createFileRoute } from "@tanstack/react-router";
import { RepositorySettingsPage } from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/settings",
)({
	component: RepositorySettingsRoute,
});

function RepositorySettingsRoute() {
	const { organization, repository } = Route.useParams();
	return (
		<RepositorySettingsPage organizationName={organization} name={repository} />
	);
}
