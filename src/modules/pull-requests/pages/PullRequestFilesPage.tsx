import {
	Alert,
	Badge,
	Checkbox,
	Group,
	Paper,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle, GitPullRequest } from "lucide-react";
import { useEffect, useState } from "react";
import SplitDiffView from "#/components/SplitDiffView";
import type { DiffFile } from "#/modules/git";
import { useRepositoryAccess } from "#/modules/organizations";
import * as m from "#/paraglide/messages";
import FileComments from "../components/FileComments";
import type {
	PullRequest,
	PullRequestComment,
	PullRequestStatus,
} from "../schemas";
import { setPullRequestFileViewedFn } from "../server/pull-request.functions";

const STATUS_COLORS: Record<PullRequestStatus, string> = {
	open: "green",
	merged: "blue",
	closed: "gray",
};

interface PullRequestFilesPageProps {
	pullRequest: PullRequest;
	files: DiffFile[];
	comments: PullRequestComment[];
}

export default function PullRequestFilesPage({
	pullRequest,
	files,
	comments,
}: PullRequestFilesPageProps) {
	const access = useRepositoryAccess();
	const router = useRouter();
	const [viewedFiles, setViewedFiles] = useState(
		() => new Set(pullRequest.viewedFiles),
	);
	const [savingFilePath, setSavingFilePath] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const commentsByFile = new Map<string, PullRequestComment[]>();
	for (const comment of comments) {
		if (comment.target.type !== "file") {
			continue;
		}
		const current = commentsByFile.get(comment.target.filePath) ?? [];
		current.push(comment);
		commentsByFile.set(comment.target.filePath, current);
	}
	const currentFilePaths = new Set(
		files
			.map((file) => file.newPath ?? file.oldPath)
			.filter((filePath): filePath is string => Boolean(filePath)),
	);
	const archivedComments =
		pullRequest.status === "open"
			? []
			: [...commentsByFile.entries()].filter(
					([filePath]) => !currentFilePaths.has(filePath),
				);

	useEffect(() => {
		setViewedFiles(new Set(pullRequest.viewedFiles));
	}, [pullRequest.viewedFiles]);

	const handleViewedChange = async (filePath: string, viewed: boolean) => {
		setError(null);
		setSavingFilePath(filePath);
		setViewedFiles((current) => {
			const next = new Set(current);
			if (viewed) {
				next.add(filePath);
			} else {
				next.delete(filePath);
			}
			return next;
		});

		try {
			await setPullRequestFileViewedFn({
				data: {
					organizationName: pullRequest.organizationName,
					repoName: pullRequest.repoName,
					id: pullRequest.id,
					filePath,
					viewed,
				},
			});
			await router.invalidate();
		} catch (cause) {
			setViewedFiles((current) => {
				const next = new Set(current);
				if (viewed) {
					next.delete(filePath);
				} else {
					next.add(filePath);
				}
				return next;
			});
			setError(
				cause instanceof Error
					? cause.message
					: m.pullRequests_pullRequestFilesPage_error_updateReview(),
			);
		} finally {
			setSavingFilePath(null);
		}
	};

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

			{error && (
				<Alert
					icon={<AlertCircle size={16} />}
					title={m.pullRequests_pullRequestFilesPage_error_updateReview_alertTitle()}
					color="red"
				>
					{error}
				</Alert>
			)}

			{files.length === 0 ? (
				<Text c="dimmed" fs="italic">
					{m.pullRequests_pullRequestFilesPage_empty()}
				</Text>
			) : (
				<Text size="sm" c="dimmed" mb="xs">
					{m.pullRequests_pullRequestFilesPage_filesChanged({
						count: files.length,
					})}
				</Text>
			)}

			{files.map((file) => {
				const filePath = file.newPath ?? file.oldPath;
				if (!filePath) {
					return null;
				}
				const viewed = viewedFiles.has(filePath);
				return (
					<SplitDiffView
						key={`${pullRequest.organizationName}:${pullRequest.repoName}:${pullRequest.id}:${filePath}`}
						file={file}
						collapsed={viewed}
						headerAction={
							access.canWrite ? (
								<Checkbox
									label={m.pullRequests_pullRequestFilesPage_viewed_label()}
									aria-label={m.pullRequests_pullRequestFilesPage_viewed_aria({
										filePath,
									})}
									checked={viewed}
									disabled={savingFilePath !== null}
									onChange={(event) => {
										void handleViewedChange(
											filePath,
											event.currentTarget.checked,
										);
									}}
								/>
							) : undefined
						}
						footer={
							<FileComments
								pullRequest={pullRequest}
								filePath={filePath}
								comments={commentsByFile.get(filePath) ?? []}
							/>
						}
					/>
				);
			})}

			{archivedComments.map(([filePath, fileComments]) => (
				<Paper key={filePath} withBorder p="md" mb="md">
					<Text size="sm" fw={600} ff="monospace">
						{filePath}
					</Text>
					<Text size="xs" c="dimmed">
						{m.pullRequests_pullRequestFilesPage_fileNotInDiff()}
					</Text>
					<FileComments
						pullRequest={pullRequest}
						filePath={filePath}
						comments={fileComments}
					/>
				</Paper>
			))}
		</Stack>
	);
}
