import { NavLink, Text } from "@mantine/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listOrganizationsFn } from "#/modules/organizations";
import type { Repository } from "#/modules/repositories";
import {
	listRepositoriesFn,
	listUserRepositoriesFn,
} from "#/modules/repositories";
import * as m from "#/paraglide/messages";

interface Props {
	opened: boolean;
	organizationName?: string;
	userName?: string;
	includeOrganizations?: boolean;
}

const INITIAL_COUNT = 5;

async function loadRepositories(
	userName: string | undefined,
	organizationName: string | undefined,
	includeOrganizations: boolean,
): Promise<Repository[]> {
	if (!userName) {
		return listRepositoriesFn({ data: { organizationName } });
	}
	const personal = await listUserRepositoriesFn({ data: { userName } });
	if (!includeOrganizations) {
		return personal;
	}
	const organizations = await listOrganizationsFn();
	const organizationRepositories = await Promise.all(
		organizations.map((organization) =>
			listRepositoriesFn({ data: { organizationName: organization.name } }),
		),
	);
	return [...personal, ...organizationRepositories.flat()];
}

export default function SidebarRecentRepositories({
	opened,
	organizationName,
	userName,
	includeOrganizations = false,
}: Props) {
	const location = useLocation();
	const navigate = useNavigate();
	const [repos, setRepos] = useState<Repository[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const loadedScopeRef = useRef<string | null>(null);
	const requestRef = useRef(0);

	useEffect(() => {
		const scope = userName ? `user:${userName}` : `org:${organizationName}`;
		if (!opened || loadedScopeRef.current === scope) {
			return;
		}
		loadedScopeRef.current = scope;
		const request = ++requestRef.current;
		setLoading(true);
		setError(null);
		setShowAll(false);
		loadRepositories(userName, organizationName, includeOrganizations)
			.then((result) => {
				if (request !== requestRef.current) return;
				const sorted = result.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
				setRepos(sorted);
				setLoading(false);
			})
			.catch((err) => {
				if (request !== requestRef.current) return;
				setError(
					err instanceof Error
						? err.message
						: m.shared_sidebar_failedRepositories(),
				);
				setLoading(false);
			});
	}, [includeOrganizations, opened, organizationName, userName]);

	if (loading) {
		return (
			<Text size="sm" c="dimmed">
				{m.shared_sidebar_loading()}
			</Text>
		);
	}

	if (error) {
		return (
			<Text size="sm" c="red">
				{error}
			</Text>
		);
	}

	if (loadedScopeRef.current === null || repos.length === 0) return null;

	const visible = showAll ? repos : repos.slice(0, INITIAL_COUNT);

	return (
		<>
			{visible.map((repo) => (
				<NavLink
					key={`${repo.organizationName}:${repo.name}`}
					component="button"
					label={repo.name}
					active={
						repo.userName
							? location.pathname ===
									`/users/${repo.userName}/repositories/${repo.name}` ||
								location.pathname.startsWith(
									`/users/${repo.userName}/repositories/${repo.name}/`,
								)
							: location.pathname ===
									`/organizations/${repo.organizationName}/repositories/${repo.name}` ||
								location.pathname.startsWith(
									`/organizations/${repo.organizationName}/repositories/${repo.name}/`,
								)
					}
					variant="light"
					onClick={() =>
						navigate({
							to: (repo.userName
								? "/users/$username/repositories/$repository"
								: "/organizations/$organization/repositories/$repository") as never,
							params: (repo.userName
								? { username: repo.userName, repository: repo.name }
								: {
										organization: repo.organizationName,
										repository: repo.name,
									}) as never,
						})
					}
				/>
			))}
			{repos.length > INITIAL_COUNT && (
				<Text
					size="sm"
					c="dimmed"
					style={{ cursor: "pointer" }}
					onClick={() => setShowAll((prev) => !prev)}
				>
					{showAll ? (
						<>
							<ChevronUp size={14} /> {m.shared_sidebar_showLess()}
						</>
					) : (
						<>
							<ChevronDown size={14} /> {m.shared_sidebar_showMore()}
						</>
					)}
				</Text>
			)}
		</>
	);
}
