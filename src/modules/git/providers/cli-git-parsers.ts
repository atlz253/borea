import type { CommitInfo, TreeEntry, TreeEntryType } from "../git-provider";

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
