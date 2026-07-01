import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiffFile } from "#/modules/git";
import type { PullRequest } from "../schemas";
import PullRequestFilesPage from "./PullRequestFilesPage";

const mocks = vi.hoisted(() => ({
	invalidate: vi.fn(),
	setViewed: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: mocks.invalidate }),
}));

vi.mock("../server/pull-request.functions", () => ({
	setPullRequestFileViewedFn: mocks.setViewed,
}));

const pullRequest: PullRequest = {
	id: 1,
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

function renderPage(pr: PullRequest = pullRequest) {
	return render(
		<MantineProvider>
			<PullRequestFilesPage pullRequest={pr} files={[file]} />
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
});
