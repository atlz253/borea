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
import { useRepositoryAccess } from "#/modules/organizations";
import * as m from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";
import type { PullRequest, PullRequestStatus } from "../schemas";

const STATUS_LABELS: Record<PullRequestStatus, string> = {
	open: m.pullRequests_pr_status_open(),
	merged: m.pullRequests_pr_status_merged(),
	closed: m.pullRequests_pr_status_closed(),
};

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
	const access = useRepositoryAccess();
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
						{STATUS_LABELS[pullRequest.status]}
					</Badge>
				</Group>

				<Text size="sm" c="dimmed">
					{m.pullRequests_pullRequestDetail_openedBy({
						id: pullRequest.id,
						author: pullRequest.authorName,
						date: pullRequest.createdAt
							? new Date(pullRequest.createdAt).toLocaleDateString(getLocale())
							: "",
					})}
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
						{m.pullRequests_pullRequestDetail_mergedAs({
							sha: pullRequest.mergeCommitSha.slice(0, SHORT_SHA_LENGTH),
						})}
					</Text>
				)}

				{hasConflict && (
					<Alert
						icon={<AlertCircle size={16} />}
						title={m.pullRequests_pullRequestDetail_mergeConflicts_title()}
						color="red"
					>
						{mergeStatus?.conflictingFiles.length > 0 ? (
							<Text size="sm">
								{m.pullRequests_pullRequestDetail_mergeConflicts_body({
									files: mergeStatus?.conflictingFiles.join(", "),
								})}
							</Text>
						) : (
							<Text size="sm">
								{m.pullRequests_pullRequestDetail_mergeConflicts_resolve()}
							</Text>
						)}
					</Alert>
				)}

				{mergeError && (
					<Alert
						icon={<AlertCircle size={16} />}
						title={m.pullRequests_pullRequestDetail_mergeFailed_title()}
						color="red"
					>
						<Text size="sm">{mergeError}</Text>
					</Alert>
				)}

				{isOpen && access.canWrite && (
					<Group gap="sm">
						<Button
							leftSection={<GitMerge size={16} />}
							onClick={() => onMerge(canFF)}
							loading={merging}
							disabled={!canMerge}
						>
							{canFF
								? m.pullRequests_pullRequestDetail_mergeFastForward_button()
								: m.pullRequests_pullRequestDetail_merge_button()}
						</Button>
						{canFF && (
							<Button
								variant="default"
								leftSection={<GitMerge size={16} />}
								onClick={() => onMerge(false)}
								loading={merging}
							>
								{m.pullRequests_pullRequestDetail_mergeCommit_button()}
							</Button>
						)}
						{canMerge && (
							<Text size="xs" c="dimmed">
								<Check size={12} style={{ display: "inline" }} />{" "}
								{m.pullRequests_pullRequestDetail_noConflicts()}
							</Text>
						)}
					</Group>
				)}
			</Stack>
		</Paper>
	);
}
