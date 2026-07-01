import { describe, expect, it } from "vitest";
import { parseNameStatus, parseUnifiedDiff } from "./cli-git-parsers";

describe("parseNameStatus", () => {
	it("parses added file", () => {
		const result = parseNameStatus("A\tsrc/new.ts");
		expect(result).toEqual([
			{ status: "added", oldPath: "src/new.ts", newPath: "src/new.ts" },
		]);
	});

	it("parses modified file", () => {
		const result = parseNameStatus("M\tsrc/index.ts");
		expect(result).toEqual([
			{ status: "modified", oldPath: "src/index.ts", newPath: "src/index.ts" },
		]);
	});

	it("parses deleted file", () => {
		const result = parseNameStatus("D\tsrc/old.ts");
		expect(result).toEqual([
			{ status: "deleted", oldPath: "src/old.ts", newPath: "src/old.ts" },
		]);
	});

	it("parses renamed file", () => {
		const result = parseNameStatus("R100\tsrc/a.ts\tsrc/b.ts");
		expect(result).toEqual([
			{ status: "renamed", oldPath: "src/a.ts", newPath: "src/b.ts" },
		]);
	});

	it("parses multiple files", () => {
		const result = parseNameStatus("M\ta.ts\nA\tb.ts\nD\tc.ts");
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({
			status: "modified",
			oldPath: "a.ts",
			newPath: "a.ts",
		});
		expect(result[1]).toEqual({
			status: "added",
			oldPath: "b.ts",
			newPath: "b.ts",
		});
		expect(result[2]).toEqual({
			status: "deleted",
			oldPath: "c.ts",
			newPath: "c.ts",
		});
	});

	it("returns empty array for empty input", () => {
		expect(parseNameStatus("")).toEqual([]);
	});
});

describe("parseUnifiedDiff", () => {
	it("parses a modified file with single hunk", () => {
		const diff = [
			"diff --git a/src/index.ts b/src/index.ts",
			"index abc123..def456 100644",
			"--- a/src/index.ts",
			"+++ b/src/index.ts",
			"@@ -1,4 +1,5 @@",
			" line1",
			"-old line",
			"+new line",
			" line3",
			" line4",
			"",
		].join("\n");

		const result = parseUnifiedDiff(diff);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			oldPath: "src/index.ts",
			newPath: "src/index.ts",
			status: "modified",
			isBinary: false,
		});
		expect(result[0].hunks).toHaveLength(1);
		expect(result[0].hunks[0].lines).toHaveLength(5);
		expect(result[0].hunks[0].lines[0]).toMatchObject({
			type: "context",
			oldLineNumber: 1,
			newLineNumber: 1,
			content: "line1",
		});
		expect(result[0].hunks[0].lines[1]).toMatchObject({
			type: "removed",
			oldLineNumber: 2,
			newLineNumber: null,
			content: "old line",
		});
		expect(result[0].hunks[0].lines[2]).toMatchObject({
			type: "added",
			oldLineNumber: null,
			newLineNumber: 2,
			content: "new line",
		});
		expect(result[0].hunks[0].lines[4]).toMatchObject({
			type: "context",
			oldLineNumber: 4,
			newLineNumber: 4,
			content: "line4",
		});
	});

	it("parses added (new) file", () => {
		const diff = [
			"diff --git a/src/new.ts b/src/new.ts",
			"new file mode 100644",
			"index 0000000..abc1234",
			"--- /dev/null",
			"+++ b/src/new.ts",
			"@@ -0,0 +1,3 @@",
			"+line1",
			"+line2",
			"+line3",
		].join("\n");

		const result = parseUnifiedDiff(diff);
		expect(result).toHaveLength(1);
		expect(result[0].status).toBe("added");
		expect(result[0].hunks[0].lines).toHaveLength(3);
		expect(result[0].hunks[0].lines[0].type).toBe("added");
	});

	it("parses deleted file", () => {
		const diff = [
			"diff --git a/src/old.ts b/src/old.ts",
			"deleted file mode 100644",
			"index abc1234..0000000",
			"--- a/src/old.ts",
			"+++ /dev/null",
			"@@ -1,3 +0,0 @@",
			"-line1",
			"-line2",
			"-line3",
		].join("\n");

		const result = parseUnifiedDiff(diff);
		expect(result).toHaveLength(1);
		expect(result[0].status).toBe("deleted");
		expect(result[0].hunks[0].lines).toHaveLength(3);
		expect(result[0].hunks[0].lines[0].type).toBe("removed");
	});

	it("detects binary file", () => {
		const diff = [
			"diff --git a/image.png b/image.png",
			"index abc123..def456 100644",
			"Binary files a/image.png and b/image.png differ",
		].join("\n");

		const result = parseUnifiedDiff(diff);
		expect(result).toHaveLength(1);
		expect(result[0].isBinary).toBe(true);
		expect(result[0].hunks).toHaveLength(0);
	});

	it("parses renamed file as modified (no rename patches)", () => {
		const diff = [
			"diff --git a/src/a.ts b/src/b.ts",
			"rename from src/a.ts",
			"rename to src/b.ts",
			"@@ -1,1 +1,1 @@",
			"-old",
			"+new",
		].join("\n");

		const result = parseUnifiedDiff(diff);
		expect(result).toHaveLength(1);
		expect(result[0].status).toBe("renamed");
	});

	it("handles multiple files in one diff", () => {
		const diff = [
			"diff --git a/a.ts b/a.ts",
			"--- a/a.ts",
			"+++ b/a.ts",
			"@@ -1,1 +1,1 @@",
			"-a",
			"+b",
			"diff --git a/c.ts b/c.ts",
			"new file mode 100644",
			"--- /dev/null",
			"+++ b/c.ts",
			"@@ -0,0 +1,1 @@",
			"+c",
		].join("\n");

		const result = parseUnifiedDiff(diff);
		expect(result).toHaveLength(2);
		expect(result[0].newPath).toBe("a.ts");
		expect(result[1].newPath).toBe("c.ts");
		expect(result[1].status).toBe("added");
	});

	it("returns empty array for empty input", () => {
		expect(parseUnifiedDiff("")).toEqual([]);
	});

	it("handles empty diff with only headers", () => {
		const diff = ["diff --git a/a.ts b/a.ts", "--- a/a.ts", "+++ b/a.ts"].join(
			"\n",
		);

		const result = parseUnifiedDiff(diff);
		expect(result).toHaveLength(1);
		expect(result[0].hunks).toHaveLength(0);
	});
});
