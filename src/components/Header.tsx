import { Anchor, Container, Group, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header>
			<Container size="lg">
				<Group justify="space-between" py="md">
					<Title order={2} style={{ fontSize: "1rem" }}>
						<Anchor
							component={Link}
							to="/"
							underline="never"
							style={{ color: "var(--mantine-color-text)" }}
						>
							Nirvana
						</Anchor>
					</Title>

					<Group gap="md">
						<Anchor component={Link} to="/" size="sm">
							Home
						</Anchor>
						<Anchor component={Link} to="/about" size="sm">
							About
						</Anchor>
					</Group>

					<ThemeToggle />
				</Group>
			</Container>
		</header>
	);
}
