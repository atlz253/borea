import { NavLink, Text } from "@mantine/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listTaskBoardsFn, type TaskBoard } from "#/modules/tasks";
import * as m from "#/paraglide/messages";

interface Props {
	opened: boolean;
	organizationName: string;
}

const INITIAL_COUNT = 5;

export default function SidebarRecentTaskBoards({
	opened,
	organizationName,
}: Props) {
	const location = useLocation();
	const navigate = useNavigate();
	const [boards, setBoards] = useState<TaskBoard[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const loadedOrganizationRef = useRef<string | null>(null);
	const requestRef = useRef(0);

	useEffect(() => {
		if (!opened || loadedOrganizationRef.current === organizationName) {
			return;
		}
		loadedOrganizationRef.current = organizationName;
		const request = ++requestRef.current;
		setLoading(true);
		setError(null);
		setShowAll(false);
		listTaskBoardsFn({ data: { organizationName } })
			.then((result) => {
				if (request !== requestRef.current) return;
				const sorted = result.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
				setBoards(sorted);
				setLoading(false);
			})
			.catch((caught) => {
				if (request !== requestRef.current) return;
				setError(
					caught instanceof Error
						? caught.message
						: m.shared_sidebar_failedTaskBoards(),
				);
				setLoading(false);
			});
	}, [opened, organizationName]);

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

	if (loadedOrganizationRef.current === null || boards.length === 0)
		return null;

	const visible = showAll ? boards : boards.slice(0, INITIAL_COUNT);

	return (
		<>
			{visible.map((board) => (
				<NavLink
					key={`${board.organizationName}:${board.key}`}
					component="button"
					label={board.name}
					active={
						location.pathname ===
							`/organizations/${board.organizationName}/tasks/${board.key}` ||
						location.pathname.startsWith(
							`/organizations/${board.organizationName}/tasks/${board.key}/`,
						)
					}
					variant="light"
					onClick={() =>
						navigate({
							to: "/organizations/$organization/tasks/$boardKey",
							params: {
								organization: board.organizationName,
								boardKey: board.key,
							},
						})
					}
				/>
			))}
			{boards.length > INITIAL_COUNT && (
				<Text
					size="sm"
					c="dimmed"
					style={{ cursor: "pointer" }}
					onClick={() => setShowAll((previous) => !previous)}
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
