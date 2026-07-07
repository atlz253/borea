import { Container, Stack, Title } from "@mantine/core";
import type { BranchInfo } from "#/modules/git";
import * as m from "#/paraglide/messages";
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
		<Container size="lg" py="xl">
			<Stack gap="md">
				<Title order={2}>{m.pullRequests_createPullRequestPage_title()}</Title>
				<CreatePullRequestForm
					branches={branches}
					onSubmit={onSubmit}
					submitting={submitting}
				/>
			</Stack>
		</Container>
	);
}
