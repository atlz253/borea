import { AppShell, Box, NavLink, ScrollArea } from "@mantine/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	Building2,
	ChevronDown,
	ChevronUp,
	ClipboardList,
	GitBranch,
} from "lucide-react";
import { useState } from "react";
import * as m from "#/paraglide/messages";
import SidebarRecentOrganizations from "./SidebarRecentOrganizations";
import SidebarRecentRepositories from "./SidebarRecentRepositories";

export default function Sidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const [opened, setOpened] = useState(true);
	const organizationName = /^\/organizations\/([^/]+)(?:\/|$)/.exec(
		location.pathname,
	)?.[1];
	const tasksActive = /^\/organizations\/[^/]+\/tasks(?:\/|$)/.test(
		location.pathname,
	);

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
			{organizationName ? (
				<>
					<NavLink
						component="button"
						label={m.shared_sidebar_repositories()}
						leftSection={<GitBranch size={16} />}
						active={!tasksActive}
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
							<SidebarRecentRepositories
								key={organizationName}
								opened={opened}
								organizationName={organizationName}
							/>
						</Box>
					)}
					<NavLink
						component="button"
						label={m.shared_sidebar_tasks()}
						leftSection={<ClipboardList size={16} />}
						active={tasksActive}
						variant="light"
						onClick={() =>
							navigate({
								to: "/organizations/$organization/tasks",
								params: { organization: organizationName },
							})
						}
					/>
				</>
			) : (
				<>
					<NavLink
						component="button"
						label={m.shared_sidebar_organizations()}
						leftSection={<Building2 size={16} />}
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
							<SidebarRecentOrganizations opened={opened} />
						</Box>
					)}
				</>
			)}
		</AppShell.Section>
	);
}
