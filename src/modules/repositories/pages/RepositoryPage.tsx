import {
	Box,
	Breadcrumbs,
	Container,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { BranchInfo } from "#/modules/git";
import * as m from "#/paraglide/messages";
import BranchSwitcher from "../components/BranchSwitcher";
import CommitCountLink from "../components/CommitCountLink";
import FileList from "../components/FileList";
import GitCloneInfo from "../components/GitCloneInfo";
import type { TreeEntry } from "../schemas";

interface RepositoryPageProps {
	organizationName?: string;
	name: string;
	path: string;
	entries: TreeEntry[];
	commitCount: number;
	branches: BranchInfo[];
	selectedBranch: string;
}

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

function pathSegments(path: string): string[] {
	return path.length > 0 ? path.split("/") : [];
}

function accumulatePath(segments: string[], index: number): string {
	return segments.slice(0, index + 1).join("/");
}

export default function RepositoryPage({
	organizationName = "default",
	name,
	path,
	entries,
	commitCount,
	branches,
	selectedBranch,
}: RepositoryPageProps) {
	const segments = pathSegments(path);
	const isEmpty = entries.length === 0;

	const encodedBranch = encodeURIComponent(selectedBranch);

	const breadcrumbItems = [
		<Link
			key="root"
			to="/organizations/$organization/repositories/$repository/tree/$branch"
			params={{
				organization: organizationName,
				repository: name,
				branch: encodedBranch,
			}}
			style={LINK_STYLE}
		>
			{name}
		</Link>,
		...segments.map((seg, i) => (
			<Link
				key={accumulatePath(segments, i)}
				to="/organizations/$organization/repositories/$repository/tree/$branch/$"
				params={{
					organization: organizationName,
					repository: name,
					branch: encodedBranch,
					_splat: accumulatePath(segments, i),
				}}
				style={LINK_STYLE}
			>
				{seg}
			</Link>
		)),
	];

	return (
		<Container size="lg" py="xl">
			<Title order={1} mb="sm">
				{name}
			</Title>

			<Stack mb="lg">
				<Group justify="space-between" align="center">
					<GitCloneInfo organizationName={organizationName} name={name} />
					<Group gap="xs">
						{branches.length > 0 && (
							<BranchSwitcher
								organizationName={organizationName}
								repoName={name}
								branches={branches}
								selectedBranch={selectedBranch}
								currentTreePath={path || undefined}
							/>
						)}
						{commitCount > 0 && (
							<CommitCountLink
								organizationName={organizationName}
								repoName={name}
								count={commitCount}
								branchName={selectedBranch}
							/>
						)}
					</Group>
				</Group>
			</Stack>

			{segments.length > 0 && (
				<Breadcrumbs separator={<ChevronRight size={14} />} mb="md">
					{breadcrumbItems}
				</Breadcrumbs>
			)}

			{isEmpty ? (
				<Box
					p="xl"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
						textAlign: "center",
					}}
				>
					<Group justify="center" mb="xs">
						<Text fw={600}>
							{m.repositories_repositoryPage_empty_heading()}
						</Text>
					</Group>
					<Text size="sm" c="dimmed">
						{m.repositories_repositoryPage_empty_description()}
					</Text>
				</Box>
			) : (
				<FileList
					organizationName={organizationName}
					entries={entries}
					repoName={name}
					currentPath={path}
					branch={selectedBranch}
				/>
			)}
		</Container>
	);
}
