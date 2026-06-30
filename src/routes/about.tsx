import { Container, Paper, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<Container size="lg" py="xl">
			<Paper withBorder p="xl" radius="lg">
				<Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">
					About
				</Text>
				<Title order={1} mb="md">
					A small starter with room to grow.
				</Title>
				<Text c="dimmed" maw={640} lh="xl">
					TanStack Start gives you type-safe routing, server functions, and
					modern SSR defaults. Use this as a clean foundation, then layer in
					your own routes, styling, and add-ons.
				</Text>
			</Paper>
		</Container>
	);
}
