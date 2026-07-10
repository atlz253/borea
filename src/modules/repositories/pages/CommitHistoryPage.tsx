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
import * as m from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";
import BranchSwitcher from "../components/BranchSwitcher";

interface CommitHistoryPageProps {
	organizationName?: string;
	userName?: string;
	name: string;
	commits: CommitInfo[];
	branches: BranchInfo[];
	selectedBranch: string;
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

export default function CommitHistoryPage({
	organizationName = "default",
	userName,
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
					to={
						(userName
							? "/users/$username/repositories/$repository/tree/$branch"
							: "/organizations/$organization/repositories/$repository/tree/$branch") as never
					}
					params={
						(userName
							? { username: userName, repository: name, branch: encodedBranch }
							: {
									organization: organizationName,
									repository: name,
									branch: encodedBranch,
								}) as never
					}
					style={{
						color: "var(--mantine-color-anchor-color)",
						textDecoration: "none",
					}}
				>
					<Group gap={4}>
						<ArrowLeft size={16} />
						<Text size="sm">{m.repositories_commitHistory_back()}</Text>
					</Group>
				</Link>
			</Group>

			<Stack gap={0} mb="lg">
				<Group justify="space-between" align="flex-end">
					<Title order={1}>{m.repositories_commitHistory_title()}</Title>
					<BranchSwitcher
						organizationName={organizationName}
						userName={userName}
						repoName={name}
						branches={branches}
						selectedBranch={selectedBranch}
						toCommits
					/>
				</Group>
				<Text size="sm" c="dimmed">
					{m.repositories_commitHistory_in()}
					{selectedBranch}
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
						<Text fw={600}>{m.repositories_commitHistory_empty_heading()}</Text>
					</Group>
					<Text size="sm" c="dimmed">
						{m.repositories_commitHistory_empty_body()}
					</Text>
				</Box>
			) : (
				<Table highlightOnHover withRowBorders>
					<Table.Thead>
						<Table.Tr>
							<Table.Th>
								{m.repositories_commitHistory_header_commit()}
							</Table.Th>
							<Table.Th>
								{m.repositories_commitHistory_header_author()}
							</Table.Th>
							<Table.Th>{m.repositories_commitHistory_header_date()}</Table.Th>
							<Table.Th>
								{m.repositories_commitHistory_header_message()}
							</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{commits.map((commit) => (
							<Table.Tr
								key={commit.sha}
								style={{ cursor: "pointer" }}
								onClick={() =>
									navigate({
										to: (userName
											? "/users/$username/repositories/$repository/tree/$branch/commits/$sha"
											: "/organizations/$organization/repositories/$repository/tree/$branch/commits/$sha") as never,
										params: (userName
											? {
													username: userName,
													repository: name,
													branch: encodedBranch,
													sha: commit.sha,
												}
											: {
													organization: organizationName,
													repository: name,
													branch: encodedBranch,
													sha: commit.sha,
												}) as never,
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
