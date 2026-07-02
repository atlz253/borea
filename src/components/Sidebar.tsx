import { AppShell, Box, NavLink, ScrollArea } from "@mantine/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronDown, ChevronUp, GitBranch } from "lucide-react";
import { useState } from "react";
import SidebarRecentOrganizations from "./SidebarRecentOrganizations";
import SidebarRecentRepositories from "./SidebarRecentRepositories";

export default function Sidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const [opened, setOpened] = useState(true);
	const organizationName = /^\/organizations\/([^/]+)(?:\/|$)/.exec(
		location.pathname,
	)?.[1];
	const label = organizationName ? "Repositories" : "Organizations";

	const handleNavigate = () => {
		if (organizationName) {
			return navigate({
				to: "/organizations/$organization",
				params: { organization: organizationName },
			});
		}
		return navigate({ to: "/organizations" });
	};

	return (
		<AppShell.Section grow component={ScrollArea}>
			<NavLink
				component="button"
				label={label}
				leftSection={
					organizationName ? <GitBranch size={16} /> : <Building2 size={16} />
				}
				active
				variant="light"
				onClick={handleNavigate}
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
					{organizationName ? (
						<SidebarRecentRepositories
							key={organizationName}
							opened={opened}
							organizationName={organizationName}
						/>
					) : (
						<SidebarRecentOrganizations opened={opened} />
					)}
				</Box>
			)}
		</AppShell.Section>
	);
}
