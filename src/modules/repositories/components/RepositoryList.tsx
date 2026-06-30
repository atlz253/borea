import { Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import type { Repository } from "../schemas";

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

export default function RepositoryList({
	repositories,
}: {
	repositories: Repository[];
}) {
	if (repositories.length === 0) {
		return <Text c="dimmed">No repositories yet.</Text>;
	}

	return (
		<Stack gap="xs">
			{repositories.map((repo) => (
				<Group key={repo.name} gap="sm">
					<GitBranch size={16} />
					<Link
						to="/repositories/$name"
						params={{ name: repo.name }}
						style={LINK_STYLE}
					>
						{repo.name}
					</Link>
					{repo.description && (
						<Text size="sm" c="dimmed" lineClamp={1}>
							{repo.description}
						</Text>
					)}
				</Group>
			))}
		</Stack>
	);
}
