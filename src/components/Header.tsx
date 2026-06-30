import { Anchor, Burger, Group, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";

export default function Header({
	opened,
	onBurgerClick,
}: {
	opened: boolean;
	onBurgerClick: () => void;
}) {
	return (
		<Group justify="space-between" h="100%" px="md">
			<Group>
				<Burger
					opened={opened}
					onClick={onBurgerClick}
					hiddenFrom="sm"
					size="sm"
					aria-label="Toggle navigation"
				/>
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
			</Group>
			<ThemeToggle />
		</Group>
	);
}
