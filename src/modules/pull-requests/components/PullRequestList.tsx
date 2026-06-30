import { Badge, Group, Table, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitPullRequest } from "lucide-react";
import type { PullRequest } from "../schemas";

const STATUS_COLORS: Record<string, string> = {
	open: "green",
	merged: "blue",
	closed: "gray",
};

interface PullRequestListProps {
	repoName: string;
	pullRequests: PullRequest[];
}

export default function PullRequestList({
	repoName,
	pullRequests,
}: PullRequestListProps) {
	if (pullRequests.length === 0) {
		return (
			<Group
				justify="center"
				py="xl"
				style={{
					border: "1px solid var(--mantine-color-default-border)",
					borderRadius: "var(--mantine-radius-md)",
				}}
			>
				<Text c="dimmed" size="sm">
					<Group gap="xs" justify="center">
						<GitPullRequest size={20} />
						<span>No pull requests yet.</span>
					</Group>
				</Text>
			</Group>
		);
	}

	const rows = pullRequests.map((pr) => (
		<Table.Tr key={pr.id}>
			<Table.Td>
				<Group gap="xs">
					<GitPullRequest size={16} />
					<Link
						to="/repositories/$name/pulls/$pullId"
						params={{ name: repoName, pullId: String(pr.id) }}
						style={{
							color: "var(--mantine-color-anchor-color)",
							textDecoration: "none",
							fontWeight: 500,
						}}
					>
						{pr.title}
					</Link>
				</Group>
			</Table.Td>
			<Table.Td>
				<Badge color={STATUS_COLORS[pr.status]} variant="light" size="sm">
					{pr.status}
				</Badge>
			</Table.Td>
			<Table.Td>
				<Text size="sm">
					{pr.sourceBranch} &rarr; {pr.targetBranch}
				</Text>
			</Table.Td>
			<Table.Td>
				<Text size="sm">{pr.authorName}</Text>
			</Table.Td>
			<Table.Td>
				<Text size="sm">{new Date(pr.createdAt).toLocaleDateString()}</Text>
			</Table.Td>
		</Table.Tr>
	));

	return (
		<Table highlightOnHover>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Title</Table.Th>
					<Table.Th>Status</Table.Th>
					<Table.Th>Branches</Table.Th>
					<Table.Th>Author</Table.Th>
					<Table.Th>Created</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>{rows}</Table.Tbody>
		</Table>
	);
}
