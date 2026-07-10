import { Container, Group, Tabs, Text } from "@mantine/core";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import {
	getRepositoryAccessFn,
	RepositoryAccessProvider,
} from "#/modules/organizations";
import * as m from "#/paraglide/messages";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository",
)({
	loader: ({ params }) =>
		getRepositoryAccessFn({
			data: {
				organizationName: params.organization,
				repositoryName: params.repository,
			},
		}),
	component: RepositoryLayout,
});

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

function RepositoryLayout() {
	const { organization, repository } = Route.useParams();
	const access = Route.useLoaderData();
	const navigate = useNavigate();
	const location = useRouterState({ select: (s) => s.location });

	const pathname = location.pathname;
	const basePath = `/organizations/${organization}/repositories/${repository}`;
	const isPulls = pathname.startsWith(`${basePath}/pulls`);
	const isSettings = pathname.startsWith(`${basePath}/settings`);
	const activeTab = isSettings ? "settings" : isPulls ? "pulls" : "code";

	return (
		<>
			<Container size="lg" pt="xl" pb={0}>
				<Group mb="xs">
					<Link
						to="/organizations/$organization"
						params={{ organization }}
						style={LINK_STYLE}
					>
						<Text size="sm">{organization}</Text>
					</Link>
					<Text size="sm" c="dimmed">
						/
					</Text>
					<Text size="sm" fw={600}>
						{repository}
					</Text>
				</Group>

				<Tabs value={activeTab} mb="lg">
					<Tabs.List>
						<Tabs.Tab
							value="code"
							onClick={() =>
								navigate({
									to: "/organizations/$organization/repositories/$repository",
									params: { organization, repository },
								})
							}
						>
							{m.routes_repository_tabs_code()}
						</Tabs.Tab>
						<Tabs.Tab
							value="pulls"
							onClick={() =>
								navigate({
									to: "/organizations/$organization/repositories/$repository/pulls",
									params: { organization, repository },
								})
							}
						>
							{m.routes_repository_tabs_pullRequests()}
						</Tabs.Tab>
						{(access.canManageAccess || access.canDelete) && (
							<Tabs.Tab
								value="settings"
								onClick={() =>
									navigate({
										to: "/organizations/$organization/repositories/$repository/settings",
										params: { organization, repository },
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
