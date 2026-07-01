import { Badge, Code, Group, Paper, Text } from "@mantine/core";
import hljs from "highlight.js";
import type { DiffFile, DiffHunk, DiffLine } from "#/modules/git";
import { detectLanguage } from "#/utils/code-language";

interface SplitDiffViewProps {
	file: DiffFile;
}

export default function SplitDiffView({ file }: SplitDiffViewProps) {
	const language = detectLanguage(file.newPath ?? file.oldPath ?? "");

	return (
		<Paper withBorder p="md" mb="md">
			<Group gap="sm" mb="xs">
				<Badge color={statusColor(file.status)} variant="light" size="sm">
					{statusLabel(file.status)}
				</Badge>
				<Text size="sm" fw={600} ff="monospace">
					{file.status === "renamed"
						? `${file.oldPath} → ${file.newPath}`
						: (file.newPath ?? file.oldPath)}
				</Text>
			</Group>

			{file.isBinary ? (
				<Text size="sm" c="dimmed" fs="italic">
					Binary file not shown
				</Text>
			) : file.hunks.length === 0 ? (
				<Text size="sm" c="dimmed" fs="italic">
					No inline diff available for this file
				</Text>
			) : (
				file.hunks.map((hunk) => (
					<DiffHunkView
						key={`${hunk.oldStart}-${hunk.newStart}`}
						hunk={hunk}
						language={language}
					/>
				))
			)}
		</Paper>
	);
}

interface DiffHunkViewProps {
	hunk: DiffHunk;
	language: string;
}

function DiffHunkView({ hunk, language }: DiffHunkViewProps) {
	const rows = buildDiffRows(hunk);

	return (
		<div className="diff-hunk" style={{ marginBottom: "0.5rem" }}>
			<div
				style={{
					fontSize: "var(--mantine-font-size-xs)",
					fontFamily: "var(--mantine-font-family-monospace)",
					color: "var(--mantine-color-dimmed)",
					padding: "4px 8px",
					background: "var(--mantine-color-default-hover)",
					borderBottom: "1px solid var(--mantine-color-default-border)",
				}}
			>
				@@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
			</div>
			<div style={{ overflowX: "auto" }}>
				<table
					style={{
						width: "100%",
						borderCollapse: "collapse",
						minWidth: "600px",
						fontSize: "var(--mantine-font-size-xs)",
						fontFamily: "var(--mantine-font-family-monospace)",
					}}
				>
					<tbody>
						{rows.map((row, idx) => {
							const rowKey = row.oldLine
								? `o${row.oldLine.oldLineNumber}${row.newLine ? `-n${row.newLine.newLineNumber}` : ""}`
								: `n${row.newLine?.newLineNumber}-${idx}`;
							return (
								<DiffRow
									key={rowKey}
									oldLine={row.oldLine}
									newLine={row.newLine}
									language={language}
								/>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

interface DiffRowProps {
	oldLine: DiffLine | null;
	newLine: DiffLine | null;
	language: string;
}

function DiffRow({ oldLine, newLine, language }: DiffRowProps) {
	const isRemoved = oldLine?.type === "removed";
	const isAdded = newLine?.type === "added";

	const oldBg = isRemoved
		? "var(--diff-removed-bg, rgba(255, 0, 0, 0.08))"
		: "transparent";
	const newBg = isAdded
		? "var(--diff-added-bg, rgba(0, 255, 0, 0.08))"
		: "transparent";

	return (
		<tr>
			<td
				style={{
					width: "50%",
					verticalAlign: "top",
					padding: 0,
					background: oldBg,
				}}
			>
				<CodeLine line={oldLine} language={language} isRemoved={isRemoved} />
			</td>
			<td
				style={{
					width: "50%",
					verticalAlign: "top",
					padding: 0,
					background: newBg,
				}}
			>
				<CodeLine line={newLine} language={language} isAdded={isAdded} />
			</td>
		</tr>
	);
}

interface CodeLineProps {
	line: DiffLine | null;
	language: string;
	isRemoved?: boolean;
	isAdded?: boolean;
}

function CodeLine({ line, language, isRemoved, isAdded }: CodeLineProps) {
	if (!line) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "stretch",
					minHeight: "1.4em",
				}}
			>
				<LineNumber />
				<div
					style={{
						paddingLeft: "0.5rem",
						flex: 1,
					}}
				/>
			</div>
		);
	}

	const lineNumber = isRemoved
		? line.oldLineNumber
		: isAdded
			? line.newLineNumber
			: (line.oldLineNumber ?? line.newLineNumber);

	const content = line.content;
	const highlighted = getHighlightedLine(content, language);

	return (
		<div
			style={{
				display: "flex",
				alignItems: "stretch",
				minHeight: "1.4em",
			}}
		>
			<LineNumber>{lineNumber}</LineNumber>
			{highlighted ? (
				<div
					style={{
						paddingLeft: "0.5rem",
						paddingRight: "0.5rem",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
						flex: 1,
					}}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: content comes from git diff output, safe
					dangerouslySetInnerHTML={{ __html: highlighted }}
				/>
			) : (
				<div
					style={{
						paddingLeft: "0.5rem",
						paddingRight: "0.5rem",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
						flex: 1,
					}}
				>
					<Code style={{ background: "none", padding: 0 }}>
						{content || " "}
					</Code>
				</div>
			)}
		</div>
	);
}

function LineNumber({ children }: { children?: React.ReactNode }) {
	return (
		<div
			style={{
				width: "3rem",
				minWidth: "3rem",
				textAlign: "right",
				paddingRight: "0.5rem",
				color: "var(--mantine-color-gray-6)",
				userSelect: "none",
				borderRight: "1px solid var(--mantine-color-default-border)",
				flexShrink: 0,
			}}
		>
			{children != null ? String(children) : ""}
		</div>
	);
}

function collectSequence(
	lines: DiffLine[],
	start: number,
	type: DiffLine["type"],
): { items: DiffLine[]; next: number } {
	const items: DiffLine[] = [];
	let i = start;
	while (i < lines.length && lines[i].type === type) {
		items.push(lines[i]);
		i++;
	}
	return { items, next: i };
}

function pairRemovedAdded(
	removed: DiffLine[],
	added: DiffLine[],
): Array<{ oldLine: DiffLine | null; newLine: DiffLine | null }> {
	const maxLen = Math.max(removed.length, added.length);
	const result: Array<{ oldLine: DiffLine | null; newLine: DiffLine | null }> =
		[];
	for (let j = 0; j < maxLen; j++) {
		result.push({
			oldLine: j < removed.length ? removed[j] : null,
			newLine: j < added.length ? added[j] : null,
		});
	}
	return result;
}

function buildDiffRows(hunk: DiffHunk): Array<{
	oldLine: DiffLine | null;
	newLine: DiffLine | null;
}> {
	const rows: Array<{ oldLine: DiffLine | null; newLine: DiffLine | null }> =
		[];
	let i = 0;

	while (i < hunk.lines.length) {
		const line = hunk.lines[i];

		if (line.type === "context") {
			rows.push({ oldLine: line, newLine: line });
			i++;
			continue;
		}

		if (line.type === "removed") {
			const removed = collectSequence(hunk.lines, i, "removed");
			const added = collectSequence(hunk.lines, removed.next, "added");
			rows.push(...pairRemovedAdded(removed.items, added.items));
			i = added.next;
			continue;
		}

		if (line.type === "added") {
			const seq = collectSequence(hunk.lines, i, "added");
			for (const added of seq.items) {
				rows.push({ oldLine: null, newLine: added });
			}
			i = seq.next;
			continue;
		}

		i++;
	}

	return rows;
}

export function getHighlightedLine(
	code: string,
	language: string,
): string | null {
	if (!code || language === "plaintext") return null;

	try {
		const result = hljs.highlight(code, { language, ignoreIllegals: true });
		return result.value || null;
	} catch {
		try {
			const result = hljs.highlightAuto(code);
			return result.value || null;
		} catch {
			return null;
		}
	}
}

function statusColor(
	status: string,
): "green" | "yellow" | "red" | "blue" | "gray" {
	switch (status) {
		case "added":
			return "green";
		case "modified":
			return "yellow";
		case "deleted":
			return "red";
		case "renamed":
			return "blue";
		default:
			return "gray";
	}
}

function statusLabel(status: string): string {
	switch (status) {
		case "added":
			return "ADDED";
		case "modified":
			return "MODIFIED";
		case "deleted":
			return "DELETED";
		case "renamed":
			return "RENAMED";
		default:
			return status.toUpperCase();
	}
}

export { buildDiffRows };
