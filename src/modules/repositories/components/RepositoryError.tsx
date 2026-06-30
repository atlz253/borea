import { Container, Text, Title } from "@mantine/core";

export default function RepositoryError({ error }: { error: unknown }) {
	const message =
		error instanceof Error ? error.message : "Failed to load repository";

	return (
		<Container size="lg" py="xl">
			<Title order={1} c="red" mb="sm">
				Error
			</Title>
			<Text c="red">{message}</Text>
		</Container>
	);
}
