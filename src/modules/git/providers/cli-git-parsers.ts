import type {
	CommitInfo,
	DiffFile,
	DiffFileStatus,
	DiffHunk,
	TreeEntry,
	TreeEntryType,
} from "../git-provider";

const LS_TREE_SEPARATOR = "\t";
const SIZE_PLACEHOLDER = "-";
const LS_TREE_MIN_PARTS = 4;
export const LOG_FORMAT = "%H%x00%h%x00%an%x00%ae%x00%aI%x00%cI%x00%s";
export const DEFAULT_LOG_LIMIT = 100;
export const DEFAULT_REF = "HEAD";

function parseLsTreeLine(line: string): TreeEntry | null {
	const tabIdx = line.indexOf(LS_TREE_SEPARATOR);
	if (tabIdx === -1) return null;

	const meta = line.slice(0, tabIdx);
	const name = line.slice(tabIdx + 1);
	const parts = meta.trim().split(/\s+/);
	if (parts.length < LS_TREE_MIN_PARTS) return null;

	const mode = parts[0];
	const type = parts[1];
	if (type !== "blob" && type !== "tree") return null;

	const entry: TreeEntry = { name, type: type as TreeEntryType, mode };

	const sizeStr = parts[3];
	if (type === "blob" && sizeStr !== SIZE_PLACEHOLDER) {
		const size = Number.parseInt(sizeStr, 10);
		if (!Number.isNaN(size)) entry.size = size;
	}

	return entry;
}

export function parseLsTree(stdout: string): TreeEntry[] {
	return stdout
		.split("\n")
		.filter(Boolean)
		.map(parseLsTreeLine)
		.filter((e): e is TreeEntry => e !== null);
}

export function parseLogOutput(stdout: string): CommitInfo[] {
	if (!stdout) return [];

	return stdout
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => {
			const [
				sha,
				shortSha,
				authorName,
				authorEmail,
				authoredAt,
				committedAt,
				subject,
			] = line.split("\0");
			return {
				sha,
				shortSha,
				authorName,
				authorEmail,
				authoredAt: new Date(authoredAt),
				committedAt: new Date(committedAt),
				subject,
			};
		});
}

export const EXTENDED_LOG_FORMAT =
	"%H%x00%h%x00%an%x00%ae%x00%aI%x00%cI%x00%s%x00%P";

interface NameStatusEntry {
	status: DiffFileStatus;
	oldPath: string;
	newPath: string;
}

export function parseNameStatus(stdout: string): NameStatusEntry[] {
	if (!stdout) return [];

	return stdout
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const parts = line.split("\t");
			const rawStatus = parts[0];
			const oldPath = parts[1] ?? "";
			const newPath = parts[2] ?? parts[1] ?? "";

			let status: DiffFileStatus;
			if (rawStatus.startsWith("A")) {
				status = "added";
			} else if (rawStatus.startsWith("D")) {
				status = "deleted";
			} else if (rawStatus.startsWith("R")) {
				status = "renamed";
			} else {
				status = "modified";
			}

			return { status, oldPath, newPath };
		});
}

function startNewFile(line: string): DiffFile {
	const paths = line.slice("diff --git ".length).split(" ");
	return {
		oldPath: paths[0]?.replace(/^a\//, "") ?? null,
		newPath: paths[1]?.replace(/^b\//, "") ?? null,
		status: "modified",
		hunks: [],
		isBinary: false,
	};
}

function handleAnnotation(line: string, file: DiffFile): boolean {
	if (line.startsWith("new file mode")) {
		file.status = "added";
		return true;
	}
	if (line.startsWith("deleted file mode")) {
		file.status = "deleted";
		return true;
	}
	if (line.startsWith("rename from ")) {
		file.status = "renamed";
		return true;
	}
	return false;
}

function parseHunkHeader(line: string): {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
} | null {
	const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
	if (!match) return null;
	return {
		oldStart: Number(match[1]),
		oldCount: Number(match[2] ?? 1),
		newStart: Number(match[3]),
		newCount: Number(match[4] ?? 1),
	};
}

function processContentLine(
	line: string,
	hunk: DiffHunk,
	state: { oldLine: number; newLine: number },
): void {
	const firstChar = line.charAt(0);
	if (firstChar === " ") {
		const content = line.slice(1);
		hunk.lines.push({
			type: "context",
			oldLineNumber: state.oldLine,
			newLineNumber: state.newLine,
			content,
		});
		state.oldLine++;
		state.newLine++;
	} else if (firstChar === "-") {
		const content = line.slice(1);
		hunk.lines.push({
			type: "removed",
			oldLineNumber: state.oldLine,
			newLineNumber: null,
			content,
		});
		state.oldLine++;
	} else if (firstChar === "+") {
		const content = line.slice(1);
		hunk.lines.push({
			type: "added",
			oldLineNumber: null,
			newLineNumber: state.newLine,
			content,
		});
		state.newLine++;
	}
}

function finaliseHunk(file: DiffFile | null, hunk: DiffHunk | null): void {
	if (file && hunk) {
		file.hunks.push(hunk);
	}
}

function isSkippableLine(line: string): boolean {
	return (
		line.startsWith("--- ") ||
		line.startsWith("+++ ") ||
		line.startsWith("rename to ")
	);
}

function isBinaryMarker(line: string): boolean {
	return line.startsWith("Binary files ");
}

function handleDiffHeader(
	line: string,
	cur: DiffFile | null,
	hunk: DiffHunk | null,
	files: DiffFile[],
): { cur: DiffFile; hunk: null } | null {
	if (!line.startsWith("diff --git ")) return null;
	finaliseHunk(cur, hunk);
	if (cur) files.push(cur);
	return { cur: startNewFile(line), hunk: null };
}

function handleHunkStart(
	line: string,
	cur: DiffFile,
	hunk: DiffHunk | null,
): { hunk: DiffHunk; state: { oldLine: number; newLine: number } } | null {
	const header = parseHunkHeader(line);
	if (!header) return null;
	finaliseHunk(cur, hunk);
	return {
		hunk: {
			oldStart: header.oldStart,
			oldCount: header.oldCount,
			newStart: header.newStart,
			newCount: header.newCount,
			lines: [],
		},
		state: { oldLine: header.oldStart, newLine: header.newStart },
	};
}

function processDiffLineInHunk(
	line: string,
	cur: DiffFile,
	hunk: DiffHunk | null,
	state: { oldLine: number; newLine: number },
): { hunk: DiffHunk; state: { oldLine: number; newLine: number } } | null {
	if (isSkippableLine(line)) return null;

	if (isBinaryMarker(line)) {
		cur.isBinary = true;
		return null;
	}

	if (handleAnnotation(line, cur)) return null;

	const hunkResult = handleHunkStart(line, cur, hunk);
	if (hunkResult) return hunkResult;

	if (hunk) {
		processContentLine(line, hunk, state);
	}
	return null;
}

export function parseUnifiedDiff(stdout: string): DiffFile[] {
	if (!stdout) return [];

	const files: DiffFile[] = [];
	let cur: DiffFile | null = null;
	let hunk: DiffHunk | null = null;
	let state = { oldLine: 0, newLine: 0 };

	for (const line of stdout.split("\n")) {
		const headerResult = handleDiffHeader(line, cur, hunk, files);
		if (headerResult) {
			cur = headerResult.cur;
			hunk = headerResult.hunk;
			continue;
		}

		if (!cur) continue;

		const result = processDiffLineInHunk(line, cur, hunk, state);
		if (result) {
			hunk = result.hunk;
			state = result.state;
		}
	}

	finaliseHunk(cur, hunk);
	if (cur) files.push(cur);

	return files;
}
