import { Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { GitPullRequest } from "lucide-react";
import SplitDiffView from "#/components/SplitDiffView";
import type { DiffFile } from "#/modules/git";
import type { PullRequest, PullRequestStatus } from "../schemas";

const STATUS_COLORS: Record<PullRequestStatus, string> = {
	open: "green",
	merged: "blue",
	closed: "gray",
};

interface PullRequestFilesPageProps {
	pullRequest: PullRequest;
	files: DiffFile[];
}

export default function PullRequestFilesPage({
	pullRequest,
	files,
}: PullRequestFilesPageProps) {
	return (
		<Stack gap="md">
			<Paper withBorder p="md" radius="md">
				<Group justify="space-between" align="flex-start">
					<Group gap="xs">
						<GitPullRequest size={20} />
						<Title order={4}>{pullRequest.title}</Title>
					</Group>
					<Badge
						color={STATUS_COLORS[pullRequest.status]}
						variant="light"
						size="lg"
					>
						{pullRequest.status}
					</Badge>
				</Group>
				<Group gap="xs" mt="xs">
					<Badge variant="outline" size="sm">
						{pullRequest.sourceBranch}
					</Badge>
					<Text size="sm">&rarr;</Text>
					<Badge variant="outline" size="sm" color="blue">
						{pullRequest.targetBranch}
					</Badge>
				</Group>
			</Paper>

			{files.length === 0 ? (
				<Text c="dimmed" fs="italic">
					No file changes in this pull request.
				</Text>
			) : (
				<Text size="sm" c="dimmed" mb="xs">
					{files.length} file{files.length !== 1 ? "s" : ""} changed
				</Text>
			)}

			{files.map((file) => {
				const fileKey = `${file.oldPath ?? ""}:${file.newPath ?? ""}`;
				return <SplitDiffView key={fileKey} file={file} />;
			})}
		</Stack>
	);
}
