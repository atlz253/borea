import { createFileRoute } from "@tanstack/react-router";
import { RepositorySettingsPage } from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/settings")({
	component: RepositorySettingsRoute,
});

function RepositorySettingsRoute() {
	const { name } = Route.useParams();
	return <RepositorySettingsPage name={name} />;
}
