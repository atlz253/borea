import {
	Box,
	Code,
	Container,
	Group,
	Stack,
	Table,
	Text,
	Title,
} from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, GitCommitHorizontal } from "lucide-react";
import type { BranchInfo, CommitInfo } from "#/modules/git";
import BranchSwitcher from "../components/BranchSwitcher";

interface CommitHistoryPageProps {
	organizationName?: string;
	name: string;
	commits: CommitInfo[];
	branches: BranchInfo[];
	selectedBranch: string;
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

export default function CommitHistoryPage({
	organizationName = "default",
	name,
	commits,
	branches,
	selectedBranch,
}: CommitHistoryPageProps) {
	const navigate = useNavigate();
	const encodedBranch = encodeURIComponent(selectedBranch);

	return (
		<Container size="lg" py="xl">
			<Group mb="md">
				<Link
					to="/organizations/$organization/repositories/$repository/tree/$branch"
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
						<Text size="sm">Back to repository</Text>
					</Group>
				</Link>
			</Group>

			<Stack gap={0} mb="lg">
				<Group justify="space-between" align="flex-end">
					<Title order={1}>Commits</Title>
					<BranchSwitcher
						organizationName={organizationName}
						repoName={name}
						branches={branches}
						selectedBranch={selectedBranch}
						toCommits
					/>
				</Group>
				<Text size="sm" c="dimmed">
					in {selectedBranch}
				</Text>
			</Stack>

			{commits.length === 0 ? (
				<Box
					p="xl"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
						textAlign: "center",
					}}
				>
					<Group justify="center" mb="xs">
						<Text fw={600}>No commits yet</Text>
					</Group>
					<Text size="sm" c="dimmed">
						This branch has no commits.
					</Text>
				</Box>
			) : (
				<Table highlightOnHover withRowBorders>
					<Table.Thead>
						<Table.Tr>
							<Table.Th>Commit</Table.Th>
							<Table.Th>Author</Table.Th>
							<Table.Th>Date</Table.Th>
							<Table.Th>Message</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{commits.map((commit) => (
							<Table.Tr
								key={commit.sha}
								style={{ cursor: "pointer" }}
								onClick={() =>
									navigate({
										to: "/organizations/$organization/repositories/$repository/tree/$branch/commits/$sha",
										params: {
											organization: organizationName,
											repository: name,
											branch: encodedBranch,
											sha: commit.sha,
										},
									})
								}
							>
								<Table.Td>
									<Group gap={4}>
										<GitCommitHorizontal size={14} />
										<Code>{commit.shortSha}</Code>
									</Group>
								</Table.Td>
								<Table.Td>
									<Text size="sm">{commit.authorName}</Text>
								</Table.Td>
								<Table.Td>
									<Text size="sm" c="dimmed">
										{formatDate(commit.committedAt)}
									</Text>
								</Table.Td>
								<Table.Td>
									<Text size="sm" lineClamp={2}>
										{commit.subject}
									</Text>
								</Table.Td>
							</Table.Tr>
						))}
					</Table.Tbody>
				</Table>
			)}
		</Container>
	);
}
