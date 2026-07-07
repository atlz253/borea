import { Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import type { BranchInfo } from "#/modules/git";
import * as m from "#/paraglide/messages";

interface CreatePullRequestFormProps {
	branches: BranchInfo[];
	onSubmit: (data: {
		title: string;
		sourceBranch: string;
		targetBranch: string;
	}) => Promise<void>;
	submitting: boolean;
}

export default function CreatePullRequestForm({
	branches,
	onSubmit,
	submitting,
}: CreatePullRequestFormProps) {
	const defaultBranch =
		branches.find((b) => b.isHead)?.name ?? branches[0]?.name ?? "";

	const [title, setTitle] = useState("");
	const [sourceBranch, setSourceBranch] = useState("");
	const [targetBranch, setTargetBranch] = useState(defaultBranch);
	const [error, setError] = useState<string | null>(null);

	const branchOptions = branches.map((b) => ({
		value: b.name,
		label: b.name,
	}));

	const handleSubmit = async () => {
		setError(null);
		if (!title.trim()) {
			setError(m.pullRequests_createPullRequestForm_error_titleRequired());
			return;
		}
		if (!sourceBranch) {
			setError(m.pullRequests_createPullRequestForm_error_sourceRequired());
			return;
		}
		if (!targetBranch) {
			setError(m.pullRequests_createPullRequestForm_error_targetRequired());
			return;
		}
		if (sourceBranch === targetBranch) {
			setError(m.pullRequests_createPullRequestForm_error_branchesDifferent());
			return;
		}
		try {
			await onSubmit({
				title: title.trim(),
				sourceBranch,
				targetBranch,
			});
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.pullRequests_createPullRequestForm_error_createFailed(),
			);
		}
	};

	return (
		<Stack maw={500} gap="md">
			<TextInput
				label={m.pullRequests_createPullRequestForm_title_label()}
				placeholder={m.pullRequests_createPullRequestForm_title_placeholder()}
				value={title}
				onChange={(e) => {
					setTitle(e.currentTarget.value);
					setError(null);
				}}
				data-autofocus
				required
			/>

			<Select
				label={m.pullRequests_createPullRequestForm_sourceBranch_label()}
				placeholder={m.pullRequests_createPullRequestForm_sourceBranch_placeholder()}
				data={branchOptions}
				value={sourceBranch}
				onChange={(val) => {
					setSourceBranch(val ?? "");
					setError(null);
				}}
				searchable
				required
			/>

			<Select
				label={m.pullRequests_createPullRequestForm_targetBranch_label()}
				placeholder={m.pullRequests_createPullRequestForm_targetBranch_placeholder()}
				data={branchOptions}
				value={targetBranch}
				onChange={(val) => {
					setTargetBranch(val ?? "");
					setError(null);
				}}
				searchable
				required
			/>

			{error && (
				<Text size="sm" c="red">
					{error}
				</Text>
			)}

			<Group justify="flex-end">
				<Button onClick={handleSubmit} loading={submitting}>
					{m.pullRequests_createPullRequestForm_create_button()}
				</Button>
			</Group>
		</Stack>
	);
}
