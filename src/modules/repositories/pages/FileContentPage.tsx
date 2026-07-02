import { CodeHighlight } from "@mantine/code-highlight";
import {
	Alert,
	Breadcrumbs,
	Button,
	Container,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileWarning } from "lucide-react";
import { useState } from "react";
import type { BranchInfo, FileContent } from "#/modules/git";
import { detectLanguage } from "#/utils/code-language";
import BranchSwitcher from "../components/BranchSwitcher";
import CommitCountLink from "../components/CommitCountLink";
import GitCloneInfo from "../components/GitCloneInfo";
import { FILE_OPEN_MAX_BYTES, FILE_PREVIEW_MAX_BYTES } from "../file-limits";
import { getRepositoryFileFn } from "../server/repository.functions";

interface FileContentPageProps {
	organizationName?: string;
	name: string;
	path: string;
	file: FileContent;
	commitCount: number;
	branches: BranchInfo[];
	selectedBranch: string;
}

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

const BYTES_PER_KIBIBYTE = 1024;
const KIBIBYTES_PER_MEBIBYTE = 1024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * KIBIBYTES_PER_MEBIBYTE;

function formatSize(bytes: number): string {
	if (bytes < BYTES_PER_KIBIBYTE) {
		return `${bytes} B`;
	}
	if (bytes < BYTES_PER_MEBIBYTE) {
		return `${(bytes / BYTES_PER_KIBIBYTE).toFixed(1)} KiB`;
	}
	return `${(bytes / BYTES_PER_MEBIBYTE).toFixed(1)} MiB`;
}

export default function FileContentPage({
	organizationName = "default",
	name,
	path,
	file,
	commitCount,
	branches,
	selectedBranch,
}: FileContentPageProps) {
	const [displayedFile, setDisplayedFile] = useState(file);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const segments = path.split("/");
	const fileName = segments.at(-1) ?? path;
	const directorySegments = segments.slice(0, -1);
	const encodedBranch = encodeURIComponent(selectedBranch);

	const openLargeFile = async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const result = await getRepositoryFileFn({
				data: {
					organizationName,
					name,
					path,
					ref: selectedBranch,
					loadLarge: true,
				},
			});
			setDisplayedFile(result);
		} catch (error) {
			setLoadError(
				error instanceof Error ? error.message : "Failed to open file",
			);
		} finally {
			setLoading(false);
		}
	};

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
		...directorySegments.map((segment, index) => {
			const directoryPath = directorySegments.slice(0, index + 1).join("/");
			return (
				<Link
					key={directoryPath}
					to="/organizations/$organization/repositories/$repository/tree/$branch/$"
					params={{
						organization: organizationName,
						repository: name,
						branch: encodedBranch,
						_splat: directoryPath,
					}}
					style={LINK_STYLE}
				>
					{segment}
				</Link>
			);
		}),
		<Text key="file" size="sm">
			{fileName}
		</Text>,
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
						<BranchSwitcher
							organizationName={organizationName}
							repoName={name}
							branches={branches}
							selectedBranch={selectedBranch}
							currentBlobPath={path}
						/>
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

			<Breadcrumbs separator={<ChevronRight size={14} />} mb="md">
				{breadcrumbItems}
			</Breadcrumbs>

			<Group justify="space-between" mb="sm">
				<Text fw={600} ff="monospace">
					{fileName}
				</Text>
				<Text size="sm" c="dimmed">
					{formatSize(displayedFile.size)}
				</Text>
			</Group>

			<FileViewer
				file={displayedFile}
				fileName={fileName}
				loading={loading}
				loadError={loadError}
				onOpen={openLargeFile}
			/>
		</Container>
	);
}

interface FileViewerProps {
	file: FileContent;
	fileName: string;
	loading: boolean;
	loadError: string | null;
	onOpen: () => Promise<void>;
}

function FileViewer({
	file,
	fileName,
	loading,
	loadError,
	onOpen,
}: FileViewerProps) {
	if (file.status === "text") {
		const language =
			file.size > FILE_PREVIEW_MAX_BYTES
				? "plaintext"
				: detectLanguage(fileName);
		return (
			<CodeHighlight
				code={file.content}
				language={language}
				withBorder
				withCopyButton
				withLineNumbers
			/>
		);
	}

	if (file.status === "binary") {
		return (
			<Alert icon={<FileWarning size={18} />} title="Binary file">
				Binary files cannot be displayed.
			</Alert>
		);
	}

	if (file.size > FILE_OPEN_MAX_BYTES) {
		return (
			<Alert
				icon={<FileWarning size={18} />}
				title="File is too large"
				color="yellow"
			>
				Files larger than 25 MiB cannot be displayed.
			</Alert>
		);
	}

	return (
		<Alert icon={<FileWarning size={18} />} title="Large file" color="yellow">
			<Text mb="md">
				This file is larger than 1 MiB. Syntax highlighting will be disabled
				when it is opened.
			</Text>
			<Button onClick={() => void onOpen()} loading={loading}>
				Open file
			</Button>
			{loadError && (
				<Text c="red" size="sm" mt="sm">
					{loadError}
				</Text>
			)}
		</Alert>
	);
}
