import { Badge, Group, Table, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitPullRequest } from "lucide-react";
import * as m from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";
import type { PullRequest } from "../schemas";

const STATUS_COLORS: Record<string, string> = {
	open: "green",
	merged: "blue",
	closed: "gray",
};

interface PullRequestListProps {
	organizationName?: string;
	repoName: string;
	pullRequests: PullRequest[];
}

export default function PullRequestList({
	organizationName = "default",
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
						<span>{m.pullRequests_pullRequestList_empty()}</span>
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
						to="/organizations/$organization/repositories/$repository/pulls/$pullId"
						params={{
							organization: organizationName,
							repository: repoName,
							pullId: String(pr.id),
						}}
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
					{pr.status === "open"
						? m.pullRequests_pr_status_open()
						: pr.status === "merged"
							? m.pullRequests_pr_status_merged()
							: m.pullRequests_pr_status_closed()}
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
				<Text size="sm">
					{new Date(pr.createdAt).toLocaleDateString(getLocale())}
				</Text>
			</Table.Td>
		</Table.Tr>
	));

	return (
		<Table highlightOnHover>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>{m.pullRequests_pullRequestList_header_title()}</Table.Th>
					<Table.Th>{m.pullRequests_pullRequestList_header_status()}</Table.Th>
					<Table.Th>
						{m.pullRequests_pullRequestList_header_branches()}
					</Table.Th>
					<Table.Th>{m.pullRequests_pullRequestList_header_author()}</Table.Th>
					<Table.Th>{m.pullRequests_pullRequestList_header_created()}</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>{rows}</Table.Tbody>
		</Table>
	);
}
