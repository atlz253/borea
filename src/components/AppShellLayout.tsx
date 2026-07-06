import { Alert, AppShell, Box, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ShieldAlert } from "lucide-react";
import type { User } from "#/modules/auth";
import type { AuthMode } from "#/platform/config";
import Footer from "./Footer";
import Header from "./Header";
import Sidebar from "./Sidebar";

const HEADER_HEIGHT_DEFAULT = 56;
const HEADER_HEIGHT_NOAUTH = 96;

export default function AppShellLayout({
	children,
	user,
	authMode,
}: {
	children: React.ReactNode;
	user: User;
	authMode: AuthMode;
}) {
	const [opened, { toggle }] = useDisclosure();

	const headerHeight =
		authMode === "noauth" ? HEADER_HEIGHT_NOAUTH : HEADER_HEIGHT_DEFAULT;

	return (
		<AppShell
			header={{ height: headerHeight }}
			navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
			padding="md"
		>
			<AppShell.Header>
				<Stack gap={0} h="100%">
					{authMode === "noauth" && (
						<Alert
							variant="filled"
							color="red"
							radius={0}
							icon={<ShieldAlert size={18} />}
							px="md"
							py={4}
							styles={{ root: { border: "none", flexShrink: 0 } }}
						>
							<Text span size="xs">
								<Text component="span" fw={600}>
									NoAuth mode
								</Text>
								{" — "}authentication is disabled, all operations are performed
								on behalf of{" "}
								<Text component="span" fw={600}>
									{user.name}
								</Text>
								. Do not use in production.
							</Text>
						</Alert>
					)}
					<Box style={{ flex: 1, display: "flex", alignItems: "center" }}>
						<Header
							opened={opened}
							onBurgerClick={toggle}
							user={user}
							authMode={authMode}
						/>
					</Box>
				</Stack>
			</AppShell.Header>
			<AppShell.Navbar>
				<Sidebar />
			</AppShell.Navbar>
			<AppShell.Main>
				{children}
				<Footer />
			</AppShell.Main>
		</AppShell>
	);
}
