import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiffFile } from "#/modules/git";
import type { PullRequest, PullRequestComment } from "../schemas";
import PullRequestFilesPage from "./PullRequestFilesPage";

const mocks = vi.hoisted(() => ({
	invalidate: vi.fn(),
	setViewed: vi.fn(),
	addComment: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: mocks.invalidate }),
}));

vi.mock("../server/pull-request.functions", () => ({
	setPullRequestFileViewedFn: mocks.setViewed,
	addPullRequestFileCommentFn: mocks.addComment,
}));

const pullRequest: PullRequest = {
	id: 1,
	organizationName: "default",
	repoName: "my-repo",
	title: "Review this change",
	sourceBranch: "feature",
	targetBranch: "main",
	status: "open",
	authorName: "anonymous",
	viewedFiles: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const file: DiffFile = {
	oldPath: null,
	newPath: "feature.ts",
	status: "added",
	isBinary: false,
	hunks: [
		{
			oldStart: 0,
			oldCount: 0,
			newStart: 1,
			newCount: 1,
			lines: [
				{
					type: "added",
					oldLineNumber: null,
					newLineNumber: 1,
					content: "export const feature = true;",
				},
			],
		},
	],
};

const comment: PullRequestComment = {
	id: "22222222-2222-4222-8222-222222222222",
	target: { type: "file", filePath: "feature.ts" },
	body: "Please cover this with a test.",
	authorId: "11111111-1111-4111-8111-111111111111",
	authorName: "Alice",
	createdAt: "2026-01-02T10:00:00.000Z",
};

function renderPage(
	pr: PullRequest = pullRequest,
	comments: PullRequestComment[] = [],
	files: DiffFile[] = [file],
) {
	return render(
		<MantineProvider>
			<PullRequestFilesPage
				pullRequest={pr}
				files={files}
				comments={comments}
			/>
		</MantineProvider>,
	);
}

describe("PullRequestFilesPage", () => {
	beforeEach(() => {
		mocks.invalidate.mockReset();
		mocks.invalidate.mockResolvedValue(undefined);
		mocks.setViewed.mockReset();
		mocks.setViewed.mockResolvedValue({
			...pullRequest,
			viewedFiles: ["feature.ts"],
		});
		mocks.addComment.mockReset();
		mocks.addComment.mockResolvedValue(comment);
	});

	it("renders persisted viewed state as collapsed", () => {
		renderPage({ ...pullRequest, viewedFiles: ["feature.ts"] });

		expect(
			screen.getByRole("checkbox", {
				name: "Mark feature.ts as viewed",
			}),
		).toBeChecked();
		expect(screen.getByText("@@ -0,0 +1,1 @@")).not.toBeVisible();
	});

	it("optimistically marks and collapses a file", async () => {
		const user = userEvent.setup();
		renderPage();
		const checkbox = screen.getByRole("checkbox", {
			name: "Mark feature.ts as viewed",
		});

		await user.click(checkbox);

		expect(checkbox).toBeChecked();
		await waitFor(() => {
			expect(screen.getByText("@@ -0,0 +1,1 @@")).not.toBeVisible();
		});
		expect(mocks.setViewed).toHaveBeenCalledWith({
			data: {
				organizationName: "default",
				repoName: "my-repo",
				id: 1,
				filePath: "feature.ts",
				viewed: true,
			},
		});
		expect(mocks.invalidate).toHaveBeenCalled();
	});

	it("unmarks and expands a viewed file", async () => {
		const user = userEvent.setup();
		renderPage({ ...pullRequest, viewedFiles: ["feature.ts"] });
		const checkbox = screen.getByRole("checkbox", {
			name: "Mark feature.ts as viewed",
		});

		await user.click(checkbox);

		expect(checkbox).not.toBeChecked();
		await waitFor(() => {
			expect(screen.getByText("@@ -0,0 +1,1 @@")).toBeVisible();
		});
	});

	it("rolls back optimistic state and shows an error", async () => {
		const user = userEvent.setup();
		mocks.setViewed.mockRejectedValue(new Error("Storage unavailable"));
		renderPage();

		await user.click(
			screen.getByRole("checkbox", {
				name: "Mark feature.ts as viewed",
			}),
		);

		await expect(screen.findByRole("alert")).resolves.toHaveTextContent(
			"Storage unavailable",
		);
		expect(
			screen.getByRole("checkbox", {
				name: "Mark feature.ts as viewed",
			}),
		).not.toBeChecked();
		expect(screen.getByText("@@ -0,0 +1,1 @@")).toBeVisible();
	});

	it("renders comments while a viewed file diff is collapsed", () => {
		renderPage({ ...pullRequest, viewedFiles: ["feature.ts"] }, [comment]);

		expect(screen.getByText("Please cover this with a test.")).toBeVisible();
		expect(screen.getByText("@@ -0,0 +1,1 @@")).not.toBeVisible();
	});

	it("adds a comment and clears the textarea", async () => {
		const user = userEvent.setup();
		renderPage();
		const textarea = screen.getByRole("textbox", {
			name: "Comment on feature.ts",
		});

		await user.type(textarea, "Please cover this with a test.");
		await user.click(screen.getByRole("button", { name: "Add comment" }));

		await waitFor(() => {
			expect(mocks.addComment).toHaveBeenCalledWith({
				data: {
					organizationName: "default",
					repoName: "my-repo",
					id: 1,
					filePath: "feature.ts",
					body: "Please cover this with a test.",
				},
			});
		});
		expect(textarea).toHaveValue("");
		expect(screen.getByText("Please cover this with a test.")).toBeVisible();
		expect(mocks.invalidate).toHaveBeenCalled();
	});

	it("keeps comment text and shows an error when submission fails", async () => {
		const user = userEvent.setup();
		mocks.addComment.mockRejectedValue(new Error("Storage unavailable"));
		renderPage();
		const textarea = screen.getByRole("textbox", {
			name: "Comment on feature.ts",
		});

		await user.type(textarea, "Keep this text");
		await user.click(screen.getByRole("button", { name: "Add comment" }));

		await expect(screen.findByRole("alert")).resolves.toHaveTextContent(
			"Storage unavailable",
		);
		expect(textarea).toHaveValue("Keep this text");
	});

	it("shows comment history without a form for a merged pull request", () => {
		renderPage({ ...pullRequest, status: "merged" }, [comment]);

		expect(screen.getByText("Please cover this with a test.")).toBeVisible();
		expect(
			screen.queryByRole("textbox", { name: "Comment on feature.ts" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Add comment" }),
		).not.toBeInTheDocument();
	});

	it("shows archived comments when a merged pull request diff is empty", () => {
		renderPage({ ...pullRequest, status: "merged" }, [comment], []);

		expect(screen.getByText("feature.ts")).toBeVisible();
		expect(
			screen.getByText("File is no longer in the current diff"),
		).toBeVisible();
		expect(screen.getByText("Please cover this with a test.")).toBeVisible();
		expect(
			screen.queryByRole("textbox", { name: "Comment on feature.ts" }),
		).not.toBeInTheDocument();
	});
});
