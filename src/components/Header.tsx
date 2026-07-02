import {
	Anchor,
	Burger,
	Button,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { logoutFn, type User } from "#/modules/auth";
import type { AuthMode } from "#/platform/config";
import ThemeToggle from "./ThemeToggle";

export default function Header({
	opened,
	onBurgerClick,
	user,
	authMode,
}: {
	opened: boolean;
	onBurgerClick: () => void;
	user: User;
	authMode: AuthMode;
}) {
	const handleLogout = async () => {
		await logoutFn();
		window.location.assign("/auth");
	};

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
			<Group gap="sm">
				<Stack gap={0} align="flex-end" visibleFrom="sm">
					<Text size="sm" fw={600}>
						{user.name}
					</Text>
					<Text size="xs" c="dimmed">
						{user.email}
					</Text>
				</Stack>
				{authMode === "full" && (
					<Button
						variant="subtle"
						size="compact-sm"
						leftSection={<LogOut size={14} />}
						onClick={() => void handleLogout()}
					>
						Log out
					</Button>
				)}
				<ThemeToggle />
			</Group>
		</Group>
	);
}
