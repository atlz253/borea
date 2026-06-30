import { Stack } from "@mantine/core";
import type { MergeStatus } from "#/modules/git";
import PullRequestDetail from "../components/PullRequestDetail";
import type { PullRequest } from "../schemas";

interface PullRequestDetailPageProps {
	pullRequest: PullRequest;
	mergeStatus?: MergeStatus;
	onMerge: (fastForward: boolean) => void;
	merging: boolean;
	mergeError?: string | null;
}

export default function PullRequestDetailPage({
	pullRequest,
	mergeStatus,
	onMerge,
	merging,
	mergeError,
}: PullRequestDetailPageProps) {
	return (
		<Stack gap="md">
			<PullRequestDetail
				pullRequest={pullRequest}
				mergeStatus={mergeStatus}
				onMerge={onMerge}
				merging={merging}
				mergeError={mergeError}
			/>
		</Stack>
	);
}
