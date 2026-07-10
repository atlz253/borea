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
import { LogOut, Settings } from "lucide-react";
import { logoutFn, type User } from "#/modules/auth";
import * as m from "#/paraglide/messages";
import type { AuthMode } from "#/platform/config";
import LanguageToggle from "./LanguageToggle";
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
		<Group justify="space-between" h="100%" px="md" w="100%">
			<Group>
				<Burger
					opened={opened}
					onClick={onBurgerClick}
					hiddenFrom="sm"
					size="sm"
					aria-label={m.shared_header_toggleNav()}
				/>
				<Title order={2} style={{ fontSize: "1rem" }}>
					<Anchor
						component={Link}
						to="/"
						underline="never"
						style={{ color: "var(--mantine-color-text)" }}
					>
						{m.shared_header_brand()}
					</Anchor>
				</Title>
			</Group>
			<Group gap="sm">
				<Stack gap={0} align="flex-end" visibleFrom="sm">
					<Text size="sm" fw={600}>
						{user.username}
					</Text>
					<Text size="xs" c="dimmed">
						{user.email}
					</Text>
				</Stack>
				{authMode === "full" && (
					<>
						<Button
							component={Link}
							to="/settings/git-tokens"
							variant="subtle"
							size="compact-sm"
							leftSection={<Settings size={14} />}
						>
							{m.shared_header_settings()}
						</Button>
						<Button
							variant="subtle"
							size="compact-sm"
							leftSection={<LogOut size={14} />}
							onClick={() => void handleLogout()}
						>
							{m.shared_header_logOut()}
						</Button>
					</>
				)}
				<LanguageToggle />
				<ThemeToggle />
			</Group>
		</Group>
	);
}
