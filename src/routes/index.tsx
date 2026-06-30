import {
	Anchor,
	Card,
	Container,
	List,
	Paper,
	SimpleGrid,
	Text,
	ThemeIcon,
	Title,
} from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

const features = [
	["Type-Safe Routing", "Routes and links stay in sync across every page."],
	[
		"Server Functions",
		"Call server code from your UI without creating API boilerplate.",
	],
	[
		"Streaming by Default",
		"Ship progressively rendered responses for faster experiences.",
	],
	[
		"Mantine UI",
		"Polished components with Mantine — layout, forms, tables, and more.",
	],
];

function App() {
	return (
		<Container size="lg" py="xl">
			<Paper withBorder p="xl" radius="lg" mb="lg">
				<Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">
					TanStack Start Base Template
				</Text>
				<Title order={1} mb="md">
					Start simple, ship quickly.
				</Title>
				<Text c="dimmed" maw={560} mb="lg">
					This base starter intentionally keeps things light: two routes, clean
					structure, and the essentials you need to build from scratch.
				</Text>
				<Anchor component={Link} to="/about">
					About This Starter
				</Anchor>
			</Paper>

			<SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
				{features.map(([title, desc]) => (
					<Card key={title} withBorder padding="lg" radius="md">
						<Title order={3} size="sm" mb="xs">
							{title}
						</Title>
						<Text size="sm" c="dimmed">
							{desc}
						</Text>
					</Card>
				))}
			</SimpleGrid>

			<Paper withBorder p="lg" radius="md">
				<Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="sm">
					Quick Start
				</Text>
				<List
					spacing="sm"
					size="sm"
					icon={
						<ThemeIcon variant="light" size={20} radius="xl">
							<Sparkles size={12} />
						</ThemeIcon>
					}
				>
					<List.Item>
						Edit <code>src/routes/index.tsx</code> to customize the home page.
					</List.Item>
					<List.Item>
						Update <code>src/components/Header.tsx</code> and{" "}
						<code>src/components/Footer.tsx</code> for brand links.
					</List.Item>
					<List.Item>
						Add routes in <code>src/routes</code> and tweak visual tokens in{" "}
						<code>src/theme.ts</code>.
					</List.Item>
				</List>
			</Paper>
		</Container>
	);
}
