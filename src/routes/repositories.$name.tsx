import { Container, Group, Tabs, Text } from "@mantine/core";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";

export const Route = createFileRoute("/repositories/$name")({
	component: RepositoryLayout,
});

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

function RepositoryLayout() {
	const { name } = Route.useParams();
	const navigate = useNavigate();
	const location = useRouterState({ select: (s) => s.location });

	const pathname = location.pathname;
	const isPulls = pathname.startsWith(`/repositories/${name}/pulls`);
	const isSettings = pathname.startsWith(`/repositories/${name}/settings`);
	const activeTab = isSettings ? "settings" : isPulls ? "pulls" : "code";

	return (
		<>
			<Container size="lg" pt="xl" pb={0}>
				<Group mb="xs">
					<Link to="/repositories" style={LINK_STYLE}>
						<Text size="sm">Repositories</Text>
					</Link>
					<Text size="sm" c="dimmed">
						/
					</Text>
					<Text size="sm" fw={600}>
						{name}
					</Text>
				</Group>

				<Tabs value={activeTab} mb="lg">
					<Tabs.List>
						<Tabs.Tab
							value="code"
							onClick={() =>
								navigate({ to: "/repositories/$name", params: { name } })
							}
						>
							Code
						</Tabs.Tab>
						<Tabs.Tab
							value="pulls"
							onClick={() =>
								navigate({
									to: "/repositories/$name/pulls",
									params: { name },
								})
							}
						>
							Pull requests
						</Tabs.Tab>
						<Tabs.Tab
							value="settings"
							onClick={() =>
								navigate({
									to: "/repositories/$name/settings",
									params: { name },
								})
							}
						>
							Settings
						</Tabs.Tab>
					</Tabs.List>
				</Tabs>
			</Container>

			<Outlet />
		</>
	);
}
