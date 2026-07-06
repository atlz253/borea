import { Anchor, Container, Group, Text } from "@mantine/core";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<Container size="lg" py="xl">
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					&copy; {year} Borea. All rights reserved.
				</Text>
				<Group gap="md">
					<Anchor
						href="https://github.com/atlz253/borea"
						target="_blank"
						rel="noreferrer"
						size="sm"
					>
						GitHub
					</Anchor>
				</Group>
			</Group>
		</Container>
	);
}
