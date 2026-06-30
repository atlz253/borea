import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Footer from "./Footer";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShellLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [opened, { toggle }] = useDisclosure();

	return (
		<AppShell
			header={{ height: 56 }}
			navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
			padding="md"
		>
			<AppShell.Header>
				<Header opened={opened} onBurgerClick={toggle} />
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
