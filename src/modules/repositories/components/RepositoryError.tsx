import { Container, Text, Title } from "@mantine/core";
import * as m from "#/paraglide/messages";

export default function RepositoryError({ error }: { error: unknown }) {
	const message =
		error instanceof Error ? error.message : m.shared_repositoryError_message();

	return (
		<Container size="lg" py="xl">
			<Title order={1} c="red" mb="sm">
				{m.shared_repositoryError_title()}
			</Title>
			<Text c="red">{message}</Text>
		</Container>
	);
}
