import { Group, Text } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import {
	checkMergeStatusFn,
	getPullRequestFn,
	mergePullRequestFn,
	PullRequestDetailPage,
} from "#/modules/pull-requests";

export const Route = createFileRoute("/repositories/$name/pulls/$pullId")({
	loader: async ({ params }) => {
		const id = Number(params.pullId);
		if (Number.isNaN(id) || id < 1) {
			throw new Error("Invalid pull request id");
		}
		const pullRequest = await getPullRequestFn({
			data: { repoName: params.name, id },
		});
		if (!pullRequest) {
			throw new Error(`Pull request #${id} not found`);
		}

		let mergeStatus = null;
		if (pullRequest.status === "open") {
			try {
				mergeStatus = await checkMergeStatusFn({
					data: { repoName: params.name, id },
				});
			} catch {
				// merge check failed, just show without status
			}
		}

		return { pullRequest, mergeStatus };
	},
	component: () => {
		const { name } = Route.useParams();
		const { pullRequest, mergeStatus } = Route.useLoaderData();
		const [merging, setMerging] = useState(false);
		const [error, setError] = useState<string | null>(null);
		const [pr, setPr] = useState(pullRequest);
		const [ms, setMs] = useState(mergeStatus);

		const handleMerge = async (fastForward: boolean) => {
			setError(null);
			setMerging(true);
			try {
				const result = await mergePullRequestFn({
					data: {
						repoName: name,
						id: pr.id,
						fastForward,
					},
				});
				setPr(result.pullRequest);
				setMs({ conflicts: false, fastForward: false, conflictingFiles: [] });
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to merge");
			} finally {
				setMerging(false);
			}
		};

		return (
			<>
				<Group mb="md">
					<Link
						to="/repositories/$name/pulls"
						params={{ name }}
						style={{
							color: "var(--mantine-color-anchor-color)",
							textDecoration: "none",
						}}
					>
						<Group gap={4}>
							<ArrowLeft size={16} />
							<Text size="sm">Back to pull requests</Text>
						</Group>
					</Link>
				</Group>

				<PullRequestDetailPage
					pullRequest={pr}
					mergeStatus={ms ?? undefined}
					onMerge={handleMerge}
					merging={merging}
					mergeError={error}
				/>
			</>
		);
	},
});
