import { AppShell, Box, NavLink, ScrollArea } from "@mantine/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, GitBranch } from "lucide-react";
import { useState } from "react";
import SidebarRecentRepositories from "./SidebarRecentRepositories";

export default function Sidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const [opened, setOpened] = useState(true);
	const isActive =
		location.pathname === "/repositories" ||
		location.pathname.startsWith("/repositories/");

	return (
		<AppShell.Section grow component={ScrollArea}>
			<NavLink
				component="button"
				label="Repositories"
				leftSection={<GitBranch size={16} />}
				active={isActive}
				variant="light"
				onClick={() => navigate({ to: "/repositories" })}
				rightSection={
					// biome-ignore lint/a11y: span inside <button>, keyboard handled by parent
					<span
						style={{ cursor: "pointer", display: "flex" }}
						onClick={(e) => {
							e.stopPropagation();
							setOpened((o) => !o);
						}}
					>
						{opened ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</span>
				}
			/>
			{opened && (
				<Box pl="1.75rem">
					<SidebarRecentRepositories opened={opened} />
				</Box>
			)}
		</AppShell.Section>
	);
}
