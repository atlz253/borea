import { Box, Group, Table, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { File, Folder } from "lucide-react";
import * as m from "#/paraglide/messages";
import type { TreeEntry } from "../schemas";

interface FileListProps {
	organizationName?: string;
	userName?: string;
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
		return m.repositories_fileList_sizeFormat({ size: bytes });
	}
	if (bytes < BYTES_PER_MB) {
		return m.repositories_fileList_sizeFormatKB({
			size: (bytes / BYTES_PER_KB).toFixed(1),
		});
	}
	return m.repositories_fileList_sizeFormatMB({
		size: (bytes / BYTES_PER_MB).toFixed(1),
	});
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

function linkProps({
	organizationName,
	userName,
	repoName,
	branch,
	path,
	kind,
}: {
	organizationName: string;
	userName?: string;
	repoName: string;
	branch: string;
	path?: string;
	kind: "blob" | "tree";
}) {
	const hasPath = Boolean(path);
	const route =
		kind === "blob"
			? userName
				? "/users/$username/repositories/$repository/blob/$branch/$"
				: "/organizations/$organization/repositories/$repository/blob/$branch/$"
			: userName
				? hasPath
					? "/users/$username/repositories/$repository/tree/$branch/$"
					: "/users/$username/repositories/$repository/tree/$branch"
				: hasPath
					? "/organizations/$organization/repositories/$repository/tree/$branch/$"
					: "/organizations/$organization/repositories/$repository/tree/$branch";
	const scoped = userName
		? { username: userName, repository: repoName, branch }
		: { organization: organizationName, repository: repoName, branch };
	return {
		to: route as never,
		params: (path ? { ...scoped, _splat: path } : scoped) as never,
	};
}

function parentDirLink(
	organizationName: string,
	userName: string | undefined,
	repoName: string,
	currentPath: string,
	branch: string,
) {
	if (currentPath.length === 0) return null;

	const slashIndex = currentPath.lastIndexOf("/");
	const encodedBranch = encodeURIComponent(branch);

	if (slashIndex === -1) {
		const props = linkProps({
			organizationName,
			userName,
			repoName,
			branch: encodedBranch,
			kind: "tree",
		});
		return (
			<Link {...props} style={LINK_STYLE}>
				<Group gap="xs">
					<Folder size={16} />
					..
				</Group>
			</Link>
		);
	}

	const props = linkProps({
		organizationName,
		userName,
		repoName,
		branch: encodedBranch,
		path: currentPath.slice(0, slashIndex),
		kind: "tree",
	});
	return (
		<Link {...props} style={LINK_STYLE}>
			<Group gap="xs">
				<Folder size={16} />
				..
			</Group>
		</Link>
	);
}

export default function FileList({
	organizationName = "default",
	userName,
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
		userName,
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
		const entryPath = childPath(currentPath, entry.name);
		const props = linkProps({
			organizationName,
			userName,
			repoName,
			branch: encodedBranch,
			path: entryPath,
			kind: isTree ? "tree" : "blob",
		});

		const nameCell = isTree ? (
			<Link {...props} style={LINK_STYLE}>
				<Group gap="xs">
					{icon}
					{entry.name}
				</Group>
			</Link>
		) : (
			<Link {...props} style={LINK_STYLE}>
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
					<Table.Th>{m.repositories_fileList_header_name()}</Table.Th>
					<Table.Th style={{ textAlign: "right" }}>
						{m.repositories_fileList_header_size()}
					</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>{rows}</Table.Tbody>
		</Table>
	);
}
