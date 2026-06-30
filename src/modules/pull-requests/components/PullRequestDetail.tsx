import {
	Alert,
	Badge,
	Button,
	Group,
	Paper,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { AlertCircle, Check, GitMerge, GitPullRequest } from "lucide-react";
import type { MergeStatus } from "#/modules/git";
import type { PullRequest, PullRequestStatus } from "../schemas";

const STATUS_COLORS: Record<PullRequestStatus, string> = {
	open: "green",
	merged: "blue",
	closed: "gray",
};

interface PullRequestDetailProps {
	pullRequest: PullRequest;
	mergeStatus?: MergeStatus;
	onMerge: (fastForward: boolean) => void;
	merging: boolean;
	mergeError?: string | null;
}

export default function PullRequestDetail({
	pullRequest,
	mergeStatus,
	onMerge,
	merging,
	mergeError,
}: PullRequestDetailProps) {
	const SHORT_SHA_LENGTH = 7;

	const isOpen = pullRequest.status === "open";
	const canMerge = isOpen && mergeStatus && !mergeStatus.conflicts;
	const hasConflict = isOpen && mergeStatus && mergeStatus.conflicts;
	const canFF = mergeStatus?.fastForward ?? false;

	return (
		<Paper withBorder p="lg" radius="md">
			<Stack gap="md">
				<Group justify="space-between" align="flex-start">
					<Group gap="xs">
						<GitPullRequest size={24} />
						<Title order={3}>{pullRequest.title}</Title>
					</Group>
					<Badge
						color={STATUS_COLORS[pullRequest.status]}
						variant="light"
						size="lg"
					>
						{pullRequest.status}
					</Badge>
				</Group>

				<Text size="sm" c="dimmed">
					#{pullRequest.id} opened by{" "}
					<Text component="span" fw={500} c="var(--mantine-color-text)">
						{pullRequest.authorName}
					</Text>{" "}
					on {new Date(pullRequest.createdAt).toLocaleDateString()}
				</Text>

				<Group gap="xs">
					<Badge variant="outline" size="lg">
						{pullRequest.sourceBranch}
					</Badge>
					<Text>&rarr;</Text>
					<Badge variant="outline" size="lg" color="blue">
						{pullRequest.targetBranch}
					</Badge>
				</Group>

				{pullRequest.mergeCommitSha && (
					<Text size="sm">
						Merged as{" "}
						<Text component="span" ff="monospace" size="sm">
							{pullRequest.mergeCommitSha.slice(0, SHORT_SHA_LENGTH)}
						</Text>
					</Text>
				)}

				{hasConflict && (
					<Alert
						icon={<AlertCircle size={16} />}
						title="Merge conflicts"
						color="red"
					>
						{mergeStatus?.conflictingFiles.length > 0 ? (
							<Text size="sm">
								Conflicts in: {mergeStatus?.conflictingFiles.join(", ")}
							</Text>
						) : (
							<Text size="sm">
								This pull request has conflicts that must be resolved before
								merging.
							</Text>
						)}
					</Alert>
				)}

				{mergeError && (
					<Alert
						icon={<AlertCircle size={16} />}
						title="Merge failed"
						color="red"
					>
						<Text size="sm">{mergeError}</Text>
					</Alert>
				)}

				{isOpen && (
					<Group gap="sm">
						<Button
							leftSection={<GitMerge size={16} />}
							onClick={() => onMerge(canFF)}
							loading={merging}
							disabled={!canMerge}
						>
							{canFF ? "Merge (fast-forward)" : "Merge"}
						</Button>
						{canFF && (
							<Button
								variant="default"
								leftSection={<GitMerge size={16} />}
								onClick={() => onMerge(false)}
								loading={merging}
							>
								Create merge commit
							</Button>
						)}
						{canMerge && (
							<Text size="xs" c="dimmed">
								<Check size={12} style={{ display: "inline" }} /> No conflicts
							</Text>
						)}
					</Group>
				)}
			</Stack>
		</Paper>
	);
}
