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
import BranchSwitcher from "../components/BranchSwitcher";
import CommitCountLink from "../components/CommitCountLink";
import FileList from "../components/FileList";
import GitCloneInfo from "../components/GitCloneInfo";
import type { TreeEntry } from "../schemas";

interface RepositoryPageProps {
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
			to="/repositories/$name/tree/$branch"
			params={{ name, branch: encodedBranch }}
			style={LINK_STYLE}
		>
			{name}
		</Link>,
		...segments.map((seg, i) => (
			<Link
				key={accumulatePath(segments, i)}
				to="/repositories/$name/tree/$branch/$"
				params={{
					name,
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
					<GitCloneInfo name={name} />
					<Group gap="xs">
						{branches.length > 1 && (
							<BranchSwitcher
								repoName={name}
								branches={branches}
								selectedBranch={selectedBranch}
								currentTreePath={path || undefined}
							/>
						)}
						{commitCount > 0 && (
							<CommitCountLink
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
						<Text fw={600}>This repository is empty</Text>
					</Group>
					<Text size="sm" c="dimmed">
						Make your first commit to see files here.
					</Text>
				</Box>
			) : (
				<FileList
					entries={entries}
					repoName={name}
					currentPath={path}
					branch={selectedBranch}
				/>
			)}
		</Container>
	);
}
