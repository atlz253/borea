import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitPullRequest, Plus } from "lucide-react";
import PullRequestList from "../components/PullRequestList";
import type { PullRequest } from "../schemas";

interface PullRequestsListPageProps {
	organizationName?: string;
	repoName: string;
	pullRequests: PullRequest[];
}

export default function PullRequestsListPage({
	organizationName = "default",
	repoName,
	pullRequests,
}: PullRequestsListPageProps) {
	const openCount = pullRequests.filter((pr) => pr.status === "open").length;

	return (
		<Container size="lg" py="xl">
			<Group justify="space-between" mb="md">
				<Stack gap={0}>
					<Title order={2}>Pull requests</Title>
					{openCount > 0 && (
						<Text size="sm" c="dimmed">
							{openCount} open
						</Text>
					)}
				</Stack>
				<Link
					to="/organizations/$organization/repositories/$repository/pulls/new"
					params={{
						organization: organizationName,
						repository: repoName,
					}}
				>
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
					<Group gap="xs" justify="center" c="dimmed">
						<GitPullRequest size={20} />
						<Text size="sm" span c="dimmed">
							No pull requests yet.
						</Text>
					</Group>
				</Group>
			) : (
				<PullRequestList
					organizationName={organizationName}
					repoName={repoName}
					pullRequests={pullRequests}
				/>
			)}
		</Container>
	);
}
