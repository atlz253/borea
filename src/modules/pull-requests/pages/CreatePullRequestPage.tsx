import { Stack, Title } from "@mantine/core";
import type { BranchInfo } from "#/modules/git";
import CreatePullRequestForm from "../components/CreatePullRequestForm";

interface CreatePullRequestPageProps {
	branches: BranchInfo[];
	onSubmit: (data: {
		title: string;
		sourceBranch: string;
		targetBranch: string;
	}) => Promise<void>;
	submitting: boolean;
}

export default function CreatePullRequestPage({
	branches,
	onSubmit,
	submitting,
}: CreatePullRequestPageProps) {
	return (
		<Stack gap="md">
			<Title order={2}>New pull request</Title>
			<CreatePullRequestForm
				branches={branches}
				onSubmit={onSubmit}
				submitting={submitting}
			/>
		</Stack>
	);
}
