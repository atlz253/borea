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
import SplitDiffView from "#/components/SplitDiffView";
import type { BranchInfo, GetCommitDiffResult } from "#/modules/git";
import * as m from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";
import BranchSwitcher from "../components/BranchSwitcher";

interface CommitDiffPageProps {
	organizationName?: string;
	name: string;
	branch: string;
	result: GetCommitDiffResult;
	branches: BranchInfo[];
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat(getLocale(), {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

export default function CommitDiffPage({
	organizationName = "default",
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
					to="/organizations/$organization/repositories/$repository/tree/$branch/commits"
					params={{
						organization: organizationName,
						repository: name,
						branch: encodedBranch,
					}}
					style={{
						color: "var(--mantine-color-anchor-color)",
						textDecoration: "none",
					}}
				>
					<Group gap={4}>
						<ArrowLeft size={16} />
						<Text size="sm">{m.repositories_commitDiff_back()}</Text>
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
						organizationName={organizationName}
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
						{m.repositories_commitDiff_authored()}
						{formatDate(commit.authoredAt)}
					</Text>
				</Group>
			</Stack>

			{isMerge && (
				<Alert icon={<Info size={16} />} color="blue" mb="md">
					{m.repositories_commitDiff_mergeAlert()}
				</Alert>
			)}

			{files.length === 0 ? (
				<Text c="dimmed" fs="italic">
					{m.repositories_commitDiff_empty()}
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
