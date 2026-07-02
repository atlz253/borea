import { Box, Group, Table, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { File, Folder } from "lucide-react";
import type { TreeEntry } from "../schemas";

interface FileListProps {
	organizationName?: string;
	entries: TreeEntry[];
	repoName: string;
	currentPath: string;
	branch: string;
}

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

function formatSize(bytes: number): string {
	if (bytes < BYTES_PER_KB) {
		return `${bytes} B`;
	}
	if (bytes < BYTES_PER_MB) {
		return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
	}
	return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

function childPath(currentPath: string, name: string): string {
	return currentPath.length > 0 ? `${currentPath}/${name}` : name;
}

function sortEntries(entries: TreeEntry[]): TreeEntry[] {
	return [...entries].sort((a, b) => {
		if (a.type !== b.type) {
			return a.type === "tree" ? -1 : 1;
		}
		return a.name.localeCompare(b.name);
	});
}

function parentDirLink(
	organizationName: string,
	repoName: string,
	currentPath: string,
	branch: string,
) {
	if (currentPath.length === 0) return null;

	const slashIndex = currentPath.lastIndexOf("/");
	const encodedBranch = encodeURIComponent(branch);

	if (slashIndex === -1) {
		return (
			<Link
				to="/organizations/$organization/repositories/$repository/tree/$branch"
				params={{
					organization: organizationName,
					repository: repoName,
					branch: encodedBranch,
				}}
				style={LINK_STYLE}
			>
				<Group gap="xs">
					<Folder size={16} />
					..
				</Group>
			</Link>
		);
	}

	return (
		<Link
			to="/organizations/$organization/repositories/$repository/tree/$branch/$"
			params={{
				organization: organizationName,
				repository: repoName,
				branch: encodedBranch,
				_splat: currentPath.slice(0, slashIndex),
			}}
			style={LINK_STYLE}
		>
			<Group gap="xs">
				<Folder size={16} />
				..
			</Group>
		</Link>
	);
}

export default function FileList({
	organizationName = "default",
	entries,
	repoName,
	currentPath,
	branch,
}: FileListProps) {
	const sorted = sortEntries(entries);
	const encodedBranch = encodeURIComponent(branch);

	const rows = [];

	const parentLink = parentDirLink(
		organizationName,
		repoName,
		currentPath,
		branch,
	);
	if (parentLink) {
		rows.push(
			<Table.Tr key="..">
				<Table.Td>{parentLink}</Table.Td>
				<Table.Td style={{ textAlign: "right" }}>
					<Box />
				</Table.Td>
			</Table.Tr>,
		);
	}

	for (const entry of sorted) {
		const isTree = entry.type === "tree";
		const icon = isTree ? <Folder size={16} /> : <File size={16} />;

		const nameCell = isTree ? (
			<Link
				to="/organizations/$organization/repositories/$repository/tree/$branch/$"
				params={{
					organization: organizationName,
					repository: repoName,
					branch: encodedBranch,
					_splat: childPath(currentPath, entry.name),
				}}
				style={LINK_STYLE}
			>
				<Group gap="xs">
					{icon}
					{entry.name}
				</Group>
			</Link>
		) : (
			<Link
				to="/organizations/$organization/repositories/$repository/blob/$branch/$"
				params={{
					organization: organizationName,
					repository: repoName,
					branch: encodedBranch,
					_splat: childPath(currentPath, entry.name),
				}}
				style={LINK_STYLE}
			>
				<Group gap="xs">
					{icon}
					<Text>{entry.name}</Text>
				</Group>
			</Link>
		);

		rows.push(
			<Table.Tr key={`${entry.type}/${entry.name}`}>
				<Table.Td>{nameCell}</Table.Td>
				<Table.Td style={{ textAlign: "right" }}>
					{entry.type === "blob" && entry.size !== undefined ? (
						<Text size="sm" c="dimmed">
							{formatSize(entry.size)}
						</Text>
					) : (
						<Box />
					)}
				</Table.Td>
			</Table.Tr>,
		);
	}

	return (
		<Table highlightOnHover withRowBorders>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Name</Table.Th>
					<Table.Th style={{ textAlign: "right" }}>Size</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>{rows}</Table.Tbody>
		</Table>
	);
}
