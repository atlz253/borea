import { Box, Group, Table, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { File, Folder } from "lucide-react";
import type { TreeEntry } from "../schemas";

interface FileListProps {
	entries: TreeEntry[];
	repoName: string;
	currentPath: string;
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

function parentDirLink(repoName: string, currentPath: string) {
	if (currentPath.length === 0) return null;

	const slashIndex = currentPath.lastIndexOf("/");
	if (slashIndex === -1) {
		return (
			<Link
				to="/repositories/$name"
				params={{ name: repoName }}
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
			to="/repositories/$name/tree/$"
			params={{ name: repoName, _splat: currentPath.slice(0, slashIndex) }}
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
	entries,
	repoName,
	currentPath,
}: FileListProps) {
	const sorted = sortEntries(entries);

	const rows = [];

	const parentLink = parentDirLink(repoName, currentPath);
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
				to="/repositories/$name/tree/$"
				params={{ name: repoName, _splat: childPath(currentPath, entry.name) }}
				style={LINK_STYLE}
			>
				<Group gap="xs">
					{icon}
					{entry.name}
				</Group>
			</Link>
		) : (
			<Group gap="xs">
				{icon}
				<Text>{entry.name}</Text>
			</Group>
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
