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
import type { PullRequest, PullRequestStatus } from "../schemas";
import { setPullRequestFileViewedFn } from "../server/pull-request.functions";

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
	const access = useRepositoryAccess();
	const router = useRouter();
	const [viewedFiles, setViewedFiles] = useState(
		() => new Set(pullRequest.viewedFiles),
	);
	const [savingFilePath, setSavingFilePath] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

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
				cause instanceof Error ? cause.message : "Failed to update file review",
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
					title="Failed to update file review"
					color="red"
				>
					{error}
				</Alert>
			)}

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
				const filePath = file.newPath ?? file.oldPath;
				if (!filePath) {
					return null;
				}
				const viewed = viewedFiles.has(filePath);
				return (
					<SplitDiffView
						key={filePath}
						file={file}
						collapsed={viewed}
						headerAction={
							access.canWrite ? (
								<Checkbox
									label="Viewed"
									aria-label={`Mark ${filePath} as viewed`}
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
					/>
				);
			})}
		</Stack>
	);
}
