import {
	Alert,
	Button,
	Divider,
	Group,
	Stack,
	Text,
	Textarea,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import * as m from "#/paraglide/messages";
import type { PullRequest, PullRequestComment } from "../schemas";
import { addPullRequestFileCommentFn } from "../server/pull-request.functions";

const ISO_MINUTE_LENGTH = 16;

interface FileCommentsProps {
	pullRequest: PullRequest;
	filePath: string;
	comments: PullRequestComment[];
}

export default function FileComments({
	pullRequest,
	filePath,
	comments,
}: FileCommentsProps) {
	const router = useRouter();
	const [visibleComments, setVisibleComments] = useState(comments);
	const [body, setBody] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setVisibleComments((current) => {
			const knownIds = new Set(current.map((comment) => comment.id));
			const added = comments.filter((comment) => !knownIds.has(comment.id));
			return added.length === 0 ? current : [...current, ...added];
		});
	}, [comments]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const comment = await addPullRequestFileCommentFn({
				data: {
					organizationName: pullRequest.organizationName,
					repoName: pullRequest.repoName,
					id: pullRequest.id,
					filePath,
					body,
				},
			});
			setVisibleComments((current) => [...current, comment]);
			setBody("");
			await router.invalidate();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: m.pullRequests_fileComments_error_add(),
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Stack gap="sm" mt="md">
			<Divider />
			<Text size="sm" fw={600}>
				{m.pullRequests_fileComments_heading({
					count: visibleComments.length,
				})}
			</Text>
			{visibleComments.length === 0 ? (
				<Text size="sm" c="dimmed">
					{m.pullRequests_fileComments_empty()}
				</Text>
			) : (
				<Stack gap="xs">
					{visibleComments.map((comment) => (
						<Stack key={comment.id} gap={4}>
							<Group gap="xs">
								<Text size="sm" fw={600}>
									{comment.authorName}
								</Text>
								<Text size="xs" c="dimmed">
									{formatCommentDate(comment.createdAt)}
								</Text>
							</Group>
							<Text
								size="sm"
								style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
							>
								{comment.body}
							</Text>
						</Stack>
					))}
				</Stack>
			)}
			{error && (
				<Alert
					icon={<AlertCircle size={16} />}
					title={m.pullRequests_fileComments_error_title()}
					color="red"
				>
					{error}
				</Alert>
			)}
			{pullRequest.status === "open" && (
				<form onSubmit={(event) => void handleSubmit(event)}>
					<Stack gap="xs">
						<Textarea
							label={m.pullRequests_fileComments_commentOn_label({
								filePath,
							})}
							autosize
							minRows={2}
							maxRows={8}
							maxLength={10_000}
							value={body}
							disabled={submitting}
							onChange={(event) => setBody(event.currentTarget.value)}
						/>
						<Button
							type="submit"
							size="xs"
							loading={submitting}
							disabled={body.trim().length === 0}
							style={{ alignSelf: "flex-end" }}
						>
							{m.pullRequests_fileComments_addComment_button()}
						</Button>
					</Stack>
				</form>
			)}
		</Stack>
	);
}

function formatCommentDate(createdAt: string): string {
	const date = createdAt.slice(0, ISO_MINUTE_LENGTH).replace("T", " ");
	return `${date} UTC`;
}
