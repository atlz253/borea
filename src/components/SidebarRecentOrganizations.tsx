import { NavLink, Text } from "@mantine/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	listOrganizationsFn,
	type Organization,
} from "#/modules/organizations";

interface Props {
	opened: boolean;
}

const INITIAL_COUNT = 5;

export default function SidebarRecentOrganizations({ opened }: Props) {
	const location = useLocation();
	const navigate = useNavigate();
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const loadedRef = useRef(false);

	useEffect(() => {
		if (!opened || loadedRef.current) return;
		loadedRef.current = true;
		setLoading(true);
		listOrganizationsFn()
			.then((result) => {
				setOrganizations(
					[...result].sort(
						(a, b) =>
							new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
					),
				);
				setLoading(false);
			})
			.catch((caught) => {
				setError(
					caught instanceof Error
						? caught.message
						: "Failed to load organizations",
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

	if (!loadedRef.current || organizations.length === 0) return null;

	const visible = showAll
		? organizations
		: organizations.slice(0, INITIAL_COUNT);

	return (
		<>
			{visible.map((organization) => (
				<NavLink
					key={organization.name}
					component="button"
					label={organization.name}
					active={location.pathname === `/organizations/${organization.name}`}
					variant="light"
					onClick={() =>
						navigate({
							to: "/organizations/$organization",
							params: { organization: organization.name },
						})
					}
				/>
			))}
			{organizations.length > INITIAL_COUNT && (
				<Text
					size="sm"
					c="dimmed"
					style={{ cursor: "pointer" }}
					onClick={() => setShowAll((previous) => !previous)}
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
