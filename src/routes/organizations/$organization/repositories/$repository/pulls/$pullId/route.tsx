import { Container, Group, Tabs, Text } from "@mantine/core";
import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import * as m from "#/paraglide/messages";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/pulls/$pullId",
)({
	component: PullRequestDetailLayout,
});

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

function PullRequestDetailLayout() {
	const { organization, repository, pullId } = Route.useParams();
	const location = useRouterState({ select: (s) => s.location });

	const pathname = location.pathname;
	const isFiles = pathname.endsWith("/files");

	return (
		<Container size="lg" py="xl">
			<Group mb="md">
				<Link
					to="/organizations/$organization/repositories/$repository/pulls"
					params={{ organization, repository }}
					style={LINK_STYLE}
				>
					<Group gap={4}>
						<ArrowLeft size={16} />
						<Text size="sm">{m.routes_repository_backToPullRequests()}</Text>
					</Group>
				</Link>
			</Group>

			<Tabs value={isFiles ? "files" : "conversation"} mb="lg">
				<Tabs.List>
					<Tabs.Tab
						value="conversation"
						renderRoot={(props) => (
							<Link
								{...props}
								to="/organizations/$organization/repositories/$repository/pulls/$pullId"
								params={{ organization, repository, pullId }}
							/>
						)}
					>
						{m.routes_repository_tabs_conversation()}
					</Tabs.Tab>
					<Tabs.Tab
						value="files"
						renderRoot={(props) => (
							<Link
								{...props}
								to="/organizations/$organization/repositories/$repository/pulls/$pullId/files"
								params={{ organization, repository, pullId }}
							/>
						)}
					>
						{m.routes_repository_tabs_filesChanged()}
					</Tabs.Tab>
				</Tabs.List>
			</Tabs>

			<Outlet />
		</Container>
	);
}
