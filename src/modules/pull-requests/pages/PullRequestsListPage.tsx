import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitPullRequest, Plus } from "lucide-react";
import PullRequestList from "../components/PullRequestList";
import type { PullRequest } from "../schemas";

interface PullRequestsListPageProps {
	repoName: string;
	pullRequests: PullRequest[];
}

export default function PullRequestsListPage({
	repoName,
	pullRequests,
}: PullRequestsListPageProps) {
	const openCount = pullRequests.filter((pr) => pr.status === "open").length;

	return (
		<>
			<Group justify="space-between" mb="md">
				<Stack gap={0}>
					<Title order={2}>Pull requests</Title>
					{openCount > 0 && (
						<Text size="sm" c="dimmed">
							{openCount} open
						</Text>
					)}
				</Stack>
				<Link to="/repositories/$name/pulls/new" params={{ name: repoName }}>
					<Button leftSection={<Plus size={16} />}>New pull request</Button>
				</Link>
			</Group>

			{pullRequests.length === 0 ? (
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
			) : (
				<PullRequestList repoName={repoName} pullRequests={pullRequests} />
			)}
		</>
	);
}
