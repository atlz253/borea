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
import { Link } from "@tanstack/react-router";
import { ArrowLeft, GitCommitHorizontal } from "lucide-react";
import type { BranchInfo, CommitInfo } from "#/modules/git";

interface CommitHistoryPageProps {
	name: string;
	commits: CommitInfo[];
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

export default function CommitHistoryPage({
	name,
	commits,
	branches,
}: CommitHistoryPageProps) {
	const activeBranch = branches.find((b) => b.isHead);

	return (
		<Container size="lg" py="xl">
			<Group mb="md">
				<Link
					to="/repositories/$name"
					params={{ name }}
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
				<Title order={1}>Commits</Title>
				{activeBranch && (
					<Text size="sm" c="dimmed">
						in {activeBranch.name}
					</Text>
				)}
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
							<Table.Tr key={commit.sha}>
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
