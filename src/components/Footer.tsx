import { Anchor, Container, Group, Text } from "@mantine/core";
import * as m from "#/paraglide/messages";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<Container size="lg" py="xl">
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					{m.shared_footer_copyright({ year })}
				</Text>
				<Group gap="md">
					<Anchor
						href="https://github.com/atlz253/borea"
						target="_blank"
						rel="noreferrer"
						size="sm"
					>
						{m.shared_footer_github()}
					</Anchor>
				</Group>
			</Group>
		</Container>
	);
}
