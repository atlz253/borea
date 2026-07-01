import { Container, Group, Tabs, Text } from "@mantine/core";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/repositories/$name/pulls/$pullId")({
	component: PullRequestDetailLayout,
});

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

function PullRequestDetailLayout() {
	const { name, pullId } = Route.useParams();
	const navigate = useNavigate();
	const location = useRouterState({ select: (s) => s.location });

	const pathname = location.pathname;
	const isFiles = pathname.endsWith("/files");

	return (
		<Container size="lg" py="xl">
			<Group mb="md">
				<Link
					to="/repositories/$name/pulls"
					params={{ name }}
					style={LINK_STYLE}
				>
					<Group gap={4}>
						<ArrowLeft size={16} />
						<Text size="sm">Back to pull requests</Text>
					</Group>
				</Link>
			</Group>

			<Tabs value={isFiles ? "files" : "conversation"} mb="lg">
				<Tabs.List>
					<Tabs.Tab
						value="conversation"
						onClick={() =>
							navigate({
								to: "/repositories/$name/pulls/$pullId",
								params: { name, pullId },
							})
						}
					>
						Conversation
					</Tabs.Tab>
					<Tabs.Tab
						value="files"
						onClick={() =>
							navigate({
								to: "/repositories/$name/pulls/$pullId/files",
								params: { name, pullId },
							})
						}
					>
						Files changed
					</Tabs.Tab>
				</Tabs.List>
			</Tabs>

			<Outlet />
		</Container>
	);
}
