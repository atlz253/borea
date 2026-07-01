import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DiffFile, DiffHunk, DiffLine } from "#/modules/git";
import { detectLanguage } from "#/utils/code-language";
import {
	buildDiffRows,
	getHighlightedLine,
	default as SplitDiffView,
} from "./SplitDiffView";

function makeLine(overrides: Partial<DiffLine> = {}): DiffLine {
	return {
		type: "context",
		oldLineNumber: 1,
		newLineNumber: 1,
		content: "line",
		...overrides,
	};
}

function makeHunk(overrides: Partial<DiffHunk> = {}): DiffHunk {
	return {
		oldStart: 1,
		oldCount: 1,
		newStart: 1,
		newCount: 1,
		lines: [],
		...overrides,
	};
}

function makeFile(overrides: Partial<DiffFile> = {}): DiffFile {
	return {
		oldPath: "old.txt",
		newPath: "new.txt",
		status: "modified",
		hunks: [],
		isBinary: false,
		...overrides,
	};
}

function renderView(props: Partial<DiffFile> = {}) {
	return render(
		<MantineProvider>
			<SplitDiffView file={makeFile(props)} />
		</MantineProvider>,
	);
}

describe("detectLanguage", () => {
	it("maps common extensions to language names", () => {
		expect(detectLanguage("foo.ts")).toBe("typescript");
		expect(detectLanguage("foo.tsx")).toBe("tsx");
		expect(detectLanguage("foo.js")).toBe("javascript");
		expect(detectLanguage("foo.py")).toBe("python");
		expect(detectLanguage("foo.go")).toBe("go");
	});

	it("maps yml to yaml", () => {
		expect(detectLanguage("config.yml")).toBe("yaml");
	});

	it("returns plaintext for unknown extensions", () => {
		expect(detectLanguage("foo.xyz")).toBe("plaintext");
	});

	it("returns plaintext for files without extension", () => {
		expect(detectLanguage("README")).toBe("plaintext");
	});

	it("is case-insensitive on extensions", () => {
		expect(detectLanguage("FOO.TS")).toBe("typescript");
	});
});

describe("getHighlightedLine", () => {
	it("returns null for empty content", () => {
		expect(getHighlightedLine("", "typescript")).toBeNull();
	});

	it("returns null for plaintext language", () => {
		expect(getHighlightedLine("some text", "plaintext")).toBeNull();
	});

	it("returns highlighted HTML for a known language", () => {
		const result = getHighlightedLine("const x = 1;", "typescript");
		expect(result).not.toBeNull();
		expect(typeof result).toBe("string");
		expect(result).toContain("const");
	});

	it("falls back to auto-detection for unknown language", () => {
		const result = getHighlightedLine("const x = 1;", "totally-not-a-language");
		expect(result).not.toBeNull();
	});
});

describe("buildDiffRows", () => {
	it("pairs context lines on both sides", () => {
		const hunk = makeHunk({
			lines: [makeLine({ type: "context", content: "ctx" })],
		});
		const rows = buildDiffRows(hunk);
		expect(rows).toHaveLength(1);
		expect(rows[0].oldLine).not.toBeNull();
		expect(rows[0].newLine).not.toBeNull();
		expect(rows[0].oldLine).toBe(rows[0].newLine);
	});

	it("pairs removed and added lines of equal length", () => {
		const hunk = makeHunk({
			lines: [
				makeLine({ type: "removed", oldLineNumber: 1, content: "old" }),
				makeLine({ type: "added", newLineNumber: 1, content: "new" }),
			],
		});
		const rows = buildDiffRows(hunk);
		expect(rows).toHaveLength(1);
		expect(rows[0].oldLine?.content).toBe("old");
		expect(rows[0].newLine?.content).toBe("new");
	});

	it("produces null old side when more added than removed", () => {
		const hunk = makeHunk({
			lines: [
				makeLine({ type: "removed", oldLineNumber: 1 }),
				makeLine({ type: "added", newLineNumber: 1 }),
				makeLine({ type: "added", newLineNumber: 2 }),
			],
		});
		const rows = buildDiffRows(hunk);
		expect(rows).toHaveLength(2);
		expect(rows[1].oldLine).toBeNull();
		expect(rows[1].newLine?.newLineNumber).toBe(2);
	});

	it("produces null new side when more removed than added", () => {
		const hunk = makeHunk({
			lines: [
				makeLine({ type: "removed", oldLineNumber: 1 }),
				makeLine({ type: "removed", oldLineNumber: 2 }),
				makeLine({ type: "added", newLineNumber: 1 }),
			],
		});
		const rows = buildDiffRows(hunk);
		expect(rows).toHaveLength(2);
		expect(rows[1].newLine).toBeNull();
		expect(rows[1].oldLine?.oldLineNumber).toBe(2);
	});

	it("pairs added-only sequences with null old side", () => {
		const hunk = makeHunk({
			lines: [
				makeLine({ type: "added", newLineNumber: 1 }),
				makeLine({ type: "added", newLineNumber: 2 }),
			],
		});
		const rows = buildDiffRows(hunk);
		expect(rows).toHaveLength(2);
		expect(rows[0].oldLine).toBeNull();
		expect(rows[0].newLine?.newLineNumber).toBe(1);
		expect(rows[1].oldLine).toBeNull();
		expect(rows[1].newLine?.newLineNumber).toBe(2);
	});

	it("handles mixed context, removed, added sequences", () => {
		const hunk = makeHunk({
			lines: [
				makeLine({ type: "context", content: "ctx1" }),
				makeLine({ type: "removed", oldLineNumber: 1, content: "old1" }),
				makeLine({ type: "removed", oldLineNumber: 2, content: "old2" }),
				makeLine({ type: "added", newLineNumber: 1, content: "new1" }),
				makeLine({ type: "context", content: "ctx2" }),
			],
		});
		const rows = buildDiffRows(hunk);
		expect(rows).toHaveLength(4);
		expect(rows[0].oldLine?.content).toBe("ctx1");
		expect(rows[0].newLine?.content).toBe("ctx1");
		expect(rows[1].oldLine?.content).toBe("old1");
		expect(rows[1].newLine?.content).toBe("new1");
		expect(rows[2].oldLine?.content).toBe("old2");
		expect(rows[2].newLine).toBeNull();
		expect(rows[3].oldLine?.content).toBe("ctx2");
		expect(rows[3].newLine?.content).toBe("ctx2");
	});

	it("returns empty array for hunk with no lines", () => {
		const hunk = makeHunk({ lines: [] });
		expect(buildDiffRows(hunk)).toEqual([]);
	});
});

describe("SplitDiffView", () => {
	it("renders ADDED badge for added file", () => {
		renderView({ status: "added", newPath: "new.txt", oldPath: null });
		expect(screen.getByText("ADDED")).toBeInTheDocument();
		expect(screen.getByText("new.txt")).toBeInTheDocument();
	});

	it("renders MODIFIED badge for modified file", () => {
		renderView({ status: "modified" });
		expect(screen.getByText("MODIFIED")).toBeInTheDocument();
	});

	it("renders DELETED badge for deleted file", () => {
		renderView({ status: "deleted", newPath: null, oldPath: "gone.txt" });
		expect(screen.getByText("DELETED")).toBeInTheDocument();
		expect(screen.getByText("gone.txt")).toBeInTheDocument();
	});

	it("renders RENAMED badge and arrow-separated path for renamed file", () => {
		renderView({ status: "renamed", oldPath: "old.txt", newPath: "new.txt" });
		expect(screen.getByText("RENAMED")).toBeInTheDocument();
		expect(screen.getByText("old.txt → new.txt")).toBeInTheDocument();
	});

	it("shows binary placeholder for binary files", () => {
		renderView({ isBinary: true });
		expect(screen.getByText("Binary file not shown")).toBeInTheDocument();
	});

	it("shows no-diff placeholder when hunks array is empty", () => {
		renderView({ hunks: [] });
		expect(
			screen.getByText("No inline diff available for this file"),
		).toBeInTheDocument();
	});

	it("renders hunk header with old/new range markers", () => {
		renderView({
			hunks: [
				makeHunk({
					oldStart: 10,
					oldCount: 3,
					newStart: 12,
					newCount: 4,
					lines: [makeLine({ type: "context", content: "x" })],
				}),
			],
		});
		expect(screen.getByText("@@ -10,3 +12,4 @@")).toBeInTheDocument();
	});

	it("renders multiple hunks with one header each", () => {
		renderView({
			hunks: [
				makeHunk({
					oldStart: 1,
					newStart: 1,
					lines: [makeLine({ type: "context", content: "a" })],
				}),
				makeHunk({
					oldStart: 10,
					newStart: 10,
					lines: [makeLine({ type: "context", content: "b" })],
				}),
			],
		});
		expect(screen.getByText("@@ -1,1 +1,1 @@")).toBeInTheDocument();
		expect(screen.getByText("@@ -10,1 +10,1 @@")).toBeInTheDocument();
	});

	it("renders plain Code fallback content for plaintext language", () => {
		renderView({
			newPath: "README",
			hunks: [
				makeHunk({
					lines: [
						makeLine({
							type: "added",
							newLineNumber: 5,
							content: "hello world",
						}),
					],
				}),
			],
		});
		expect(screen.getByText("hello world")).toBeInTheDocument();
	});

	it("renders line content for highlighted language", () => {
		renderView({
			newPath: "foo.ts",
			hunks: [
				makeHunk({
					lines: [
						makeLine({
							type: "added",
							newLineNumber: 5,
							content: "const x = 1;",
						}),
					],
				}),
			],
		});
		expect(screen.getByText(/5/)).toBeInTheDocument();
	});

	it("renders a header action", () => {
		render(
			<MantineProvider>
				<SplitDiffView
					file={makeFile()}
					headerAction={<button type="button">Review action</button>}
				/>
			</MantineProvider>,
		);

		expect(
			screen.getByRole("button", { name: "Review action" }),
		).toBeInTheDocument();
	});

	it("hides diff content when collapsed", () => {
		render(
			<MantineProvider>
				<SplitDiffView
					file={makeFile({
						hunks: [
							makeHunk({
								lines: [makeLine({ content: "collapsed content" })],
							}),
						],
					})}
					collapsed
				/>
			</MantineProvider>,
		);

		for (const element of screen.getAllByText("collapsed content")) {
			expect(element).not.toBeVisible();
		}
	});
});
