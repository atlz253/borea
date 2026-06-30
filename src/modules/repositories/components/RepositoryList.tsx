import { Group, Stack, Text } from "@mantine/core";
import { GitBranch } from "lucide-react";
import type { Repository } from "../schemas";

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
					<Text>{repo.name}</Text>
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
