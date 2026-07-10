import { Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import * as m from "#/paraglide/messages";
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
		return <Text c="dimmed">{m.repositories_repositoryList_empty()}</Text>;
	}

	return (
		<Stack gap="xs">
			{repositories.map((repo) => (
				<Group
					key={`${repo.organizationName ?? repo.userName}:${repo.name}`}
					gap="sm"
				>
					<GitBranch size={16} />
					<Link
						to={
							(repo.userName
								? "/users/$username/repositories/$repository"
								: "/organizations/$organization/repositories/$repository") as never
						}
						params={
							(repo.userName
								? { username: repo.userName, repository: repo.name }
								: {
										organization: repo.organizationName,
										repository: repo.name,
									}) as never
						}
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
