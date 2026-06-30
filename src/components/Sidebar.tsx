import { AppShell, NavLink, ScrollArea } from "@mantine/core";
import { Link, useLocation } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";

export default function Sidebar() {
	const location = useLocation();
	const isActive = location.pathname === "/repositories";

	return (
		<AppShell.Section grow component={ScrollArea}>
			<NavLink
				component={Link}
				to="/repositories"
				label="Repositories"
				leftSection={<GitBranch size={16} />}
				active={isActive}
				variant="light"
			/>
		</AppShell.Section>
	);
}
