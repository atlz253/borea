import { NavLink, Text } from "@mantine/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Repository } from "#/modules/repositories";
import { listRepositoriesFn } from "#/modules/repositories";

interface Props {
	opened: boolean;
}

const INITIAL_COUNT = 5;

export default function SidebarRecentRepositories({ opened }: Props) {
	const location = useLocation();
	const navigate = useNavigate();
	const [repos, setRepos] = useState<Repository[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const loadedRef = useRef(false);

	useEffect(() => {
		if (!opened || loadedRef.current) return;
		loadedRef.current = true;
		setLoading(true);
		listRepositoriesFn()
			.then((result) => {
				const sorted = [...result].sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
				setRepos(sorted);
				setLoading(false);
			})
			.catch((err) => {
				setError(
					err instanceof Error ? err.message : "Failed to load repositories",
				);
				setLoading(false);
			});
	}, [opened]);

	if (loading) {
		return (
			<Text size="sm" c="dimmed">
				Loading...
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

	if (!loadedRef.current || repos.length === 0) return null;

	const visible = showAll ? repos : repos.slice(0, INITIAL_COUNT);

	return (
		<>
			{visible.map((repo) => (
				<NavLink
					key={repo.name}
					component="button"
					label={repo.name}
					active={location.pathname === `/repositories/${repo.name}`}
					variant="light"
					onClick={() =>
						navigate({
							to: "/repositories/$name",
							params: { name: repo.name },
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
							<ChevronUp size={14} /> Show less
						</>
					) : (
						<>
							<ChevronDown size={14} /> Show more
						</>
					)}
				</Text>
			)}
		</>
	);
}
