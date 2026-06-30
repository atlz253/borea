import { Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import type { BranchInfo } from "#/modules/git";

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
			setError("Title is required");
			return;
		}
		if (!sourceBranch) {
			setError("Source branch is required");
			return;
		}
		if (!targetBranch) {
			setError("Target branch is required");
			return;
		}
		if (sourceBranch === targetBranch) {
			setError("Source and target branches must be different");
			return;
		}
		try {
			await onSubmit({
				title: title.trim(),
				sourceBranch,
				targetBranch,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create PR");
		}
	};

	return (
		<Stack maw={500} gap="md">
			<TextInput
				label="Title"
				placeholder="e.g. Add new feature"
				value={title}
				onChange={(e) => {
					setTitle(e.currentTarget.value);
					setError(null);
				}}
				data-autofocus
				required
			/>

			<Select
				label="Source branch"
				placeholder="Select source branch"
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
				label="Target branch"
				placeholder="Select target branch"
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
					Create pull request
				</Button>
			</Group>
		</Stack>
	);
}
