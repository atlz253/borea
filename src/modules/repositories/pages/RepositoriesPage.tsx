import { Container, Text, Title } from "@mantine/core";

export default function RepositoriesPage() {
	return (
		<Container size="lg" py="xl">
			<Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">
				Nirvana
			</Text>
			<Title order={1} mb="md">
				Repositories
			</Title>
			<Text c="dimmed">No repositories yet.</Text>
		</Container>
	);
}
