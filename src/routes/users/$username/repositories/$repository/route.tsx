import { Container, Group, Tabs, Text } from "@mantine/core";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { RepositoryAccessProvider } from "#/modules/organizations";
import { getUserRepositoryAccessFn } from "#/modules/repositories";
import * as m from "#/paraglide/messages";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository",
)({
	loader: ({ params }) =>
		getUserRepositoryAccessFn({
			data: { userName: params.username, name: params.repository },
		}),
	component: UserRepositoryLayout,
});

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

function UserRepositoryLayout() {
	const { username, repository } = Route.useParams();
	const access = Route.useLoaderData();
	const navigate = useNavigate();
	const location = useRouterState({ select: (s) => s.location });
	const basePath = `/users/${username}/repositories/${repository}`;
	const isSettings = location.pathname.startsWith(`${basePath}/settings`);

	return (
		<>
			<Container size="lg" pt="xl" pb={0}>
				<Group mb="xs">
					<Link to="/users/$username" params={{ username }} style={LINK_STYLE}>
						<Text size="sm">{username}</Text>
					</Link>
					<Text size="sm" c="dimmed">
						/
					</Text>
					<Text size="sm" fw={600}>
						{repository}
					</Text>
				</Group>
				<Tabs value={isSettings ? "settings" : "code"} mb="lg">
					<Tabs.List>
						<Tabs.Tab
							value="code"
							onClick={() =>
								navigate({
									to: "/users/$username/repositories/$repository",
									params: { username, repository },
								})
							}
						>
							{m.routes_repository_tabs_code()}
						</Tabs.Tab>
						{access.canDelete && (
							<Tabs.Tab
								value="settings"
								onClick={() =>
									navigate({
										to: "/users/$username/repositories/$repository/settings",
										params: { username, repository },
									})
								}
							>
								{m.routes_repository_tabs_settings()}
							</Tabs.Tab>
						)}
					</Tabs.List>
				</Tabs>
			</Container>
			<RepositoryAccessProvider access={access}>
				<Outlet />
			</RepositoryAccessProvider>
		</>
	);
}
