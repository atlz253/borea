import {
	Alert,
	Code,
	Container,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, GitCommitHorizontal, Info } from "lucide-react";
import type { BranchInfo, GetCommitDiffResult } from "#/modules/git";
import BranchSwitcher from "../components/BranchSwitcher";
import SplitDiffView from "../components/SplitDiffView";

interface CommitDiffPageProps {
	name: string;
	branch: string;
	result: GetCommitDiffResult;
	branches: BranchInfo[];
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

export default function CommitDiffPage({
	name,
	branch,
	result,
	branches,
}: CommitDiffPageProps) {
	const encodedBranch = encodeURIComponent(branch);
	const { commit, files } = result;
	const isMerge =
		commit.parentSha !== null &&
		files.length > 0 &&
		files.every((f) => f.hunks.length === 0 && !f.isBinary);

	return (
		<Container size="lg" py="xl">
			<Group mb="md">
				<Link
					to="/repositories/$name/tree/$branch/commits"
					params={{ name, branch: encodedBranch }}
					style={{
						color: "var(--mantine-color-anchor-color)",
						textDecoration: "none",
					}}
				>
					<Group gap={4}>
						<ArrowLeft size={16} />
						<Text size="sm">Back to commits</Text>
					</Group>
				</Link>
			</Group>

			<Stack gap={0} mb="lg">
				<Group justify="space-between" align="flex-end">
					<Title order={1}>
						<Group gap={8}>
							<GitCommitHorizontal size={24} />
							<Code>{commit.shortSha}</Code>
						</Group>
					</Title>
					<BranchSwitcher
						repoName={name}
						branches={branches}
						selectedBranch={branch}
						toCommits
					/>
				</Group>
				<Text size="sm" c="dimmed">
					{commit.subject}
				</Text>
				<Group gap="xs" mt={4}>
					<Text size="sm" fw={500}>
						{commit.authorName}
					</Text>
					<Text size="sm" c="dimmed">
						authored {formatDate(commit.authoredAt)}
					</Text>
				</Group>
			</Stack>

			{isMerge && (
				<Alert icon={<Info size={16} />} color="blue" mb="md">
					This is a merge commit. Inline diff is not shown for combined changes.
				</Alert>
			)}

			{files.length === 0 ? (
				<Text c="dimmed" fs="italic">
					No file changes in this commit.
				</Text>
			) : (
				files.map((file) => {
					const fileKey = `${file.oldPath ?? ""}:${file.newPath ?? ""}`;
					return <SplitDiffView key={fileKey} file={file} />;
				})
			)}
		</Container>
	);
}
