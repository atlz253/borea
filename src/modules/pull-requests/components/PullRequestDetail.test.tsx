import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { MergeStatus } from "#/modules/git";
import type { PullRequest } from "../schemas";
import PullRequestDetail from "./PullRequestDetail";

function makePR(overrides: Partial<PullRequest> = {}): PullRequest {
	return {
		id: 1,
		organizationName: "default",
		repoName: "my-repo",
		title: "My PR",
		sourceBranch: "feature",
		targetBranch: "main",
		status: "open",
		authorName: "alice",
		viewedFiles: [],
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	};
}

function makeMergeStatus(overrides: Partial<MergeStatus> = {}): MergeStatus {
	return {
		conflicts: false,
		fastForward: false,
		conflictingFiles: [],
		...overrides,
	};
}

interface Props {
	pullRequest?: PullRequest;
	mergeStatus?: MergeStatus;
	onMerge?: (fastForward: boolean) => void;
	merging?: boolean;
	mergeError?: string | null;
}

function renderDetail(props: Props = {}) {
	const onMerge = props.onMerge ?? (() => {});
	return render(
		<MantineProvider>
			<PullRequestDetail
				pullRequest={props.pullRequest ?? makePR()}
				mergeStatus={props.mergeStatus}
				onMerge={onMerge}
				merging={props.merging ?? false}
				mergeError={props.mergeError}
			/>
		</MantineProvider>,
	);
}

describe("PullRequestDetail", () => {
	it("renders the PR title and id", () => {
		renderDetail({ pullRequest: makePR({ id: 42, title: "Fix bug" }) });
		expect(
			screen.getByRole("heading", { name: "Fix bug" }),
		).toBeInTheDocument();
		expect(screen.getByText(/#42 opened by/)).toBeInTheDocument();
	});

	it("renders author name", () => {
		renderDetail({ pullRequest: makePR({ authorName: "bob" }) });
		expect(screen.getByText("bob")).toBeInTheDocument();
	});

	it("renders source and target branch badges", () => {
		renderDetail({
			pullRequest: makePR({ sourceBranch: "feat", targetBranch: "main" }),
		});
		expect(screen.getByText("feat")).toBeInTheDocument();
		expect(screen.getByText("main")).toBeInTheDocument();
	});

	it("does not render merge commit info when mergeCommitSha is absent", () => {
		renderDetail();
		expect(screen.queryByText(/Merged as/i)).not.toBeInTheDocument();
	});

	it("renders short merge commit sha when merged", () => {
		renderDetail({
			pullRequest: makePR({
				status: "merged",
				mergeCommitSha: "abcdef1234567890",
			}),
		});
		expect(screen.getByText(/Merged as/i)).toBeInTheDocument();
		expect(screen.getByText("abcdef1")).toBeInTheDocument();
	});

	describe("status badge", () => {
		it("shows open status", () => {
			renderDetail({ pullRequest: makePR({ status: "open" }) });
			expect(screen.getByText("open")).toBeInTheDocument();
		});

		it("shows merged status", () => {
			renderDetail({ pullRequest: makePR({ status: "merged" }) });
			expect(screen.getByText("merged")).toBeInTheDocument();
		});

		it("shows closed status", () => {
			renderDetail({ pullRequest: makePR({ status: "closed" }) });
			expect(screen.getByText("closed")).toBeInTheDocument();
		});
	});

	describe("conflicts", () => {
		it("renders conflict alert with file list when conflicts present", () => {
			renderDetail({
				mergeStatus: makeMergeStatus({
					conflicts: true,
					conflictingFiles: ["a.ts", "b.ts"],
				}),
			});
			expect(screen.getByText("Merge conflicts")).toBeInTheDocument();
			expect(
				screen.getByText(/Conflicts in: a\.ts, b\.ts/),
			).toBeInTheDocument();
		});

		it("renders conflict alert generic text when no file list", () => {
			renderDetail({
				mergeStatus: makeMergeStatus({
					conflicts: true,
					conflictingFiles: [],
				}),
			});
			expect(screen.getByText("Merge conflicts")).toBeInTheDocument();
			expect(
				screen.getByText(/conflicts that must be resolved before merging/i),
			).toBeInTheDocument();
		});
	});

	describe("merge error", () => {
		it("renders merge failure alert when mergeError is set", () => {
			renderDetail({ mergeError: "Something went wrong" });
			expect(screen.getByText("Merge failed")).toBeInTheDocument();
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});

		it("does not render merge failure when mergeError is null", () => {
			renderDetail({ mergeError: null });
			expect(screen.queryByText("Merge failed")).not.toBeInTheDocument();
		});
	});

	describe("merge buttons (open PR)", () => {
		it("renders disabled Merge button when no merge status", () => {
			renderDetail({
				pullRequest: makePR({ status: "open" }),
				mergeStatus: undefined,
			});
			const button = screen.getByRole("button", { name: /merge/i });
			expect(button).toBeDisabled();
		});

		it("renders disabled Merge button when conflicts present", () => {
			renderDetail({
				mergeStatus: makeMergeStatus({ conflicts: true }),
			});
			const button = screen.getByRole("button", { name: /^merge$/i });
			expect(button).toBeDisabled();
		});

		it("renders enabled Merge button and No conflicts hint when mergeable", () => {
			renderDetail({
				mergeStatus: makeMergeStatus({ conflicts: false }),
			});
			const button = screen.getByRole("button", { name: /^merge$/i });
			expect(button).not.toBeDisabled();
			expect(screen.getByText(/No conflicts/i)).toBeInTheDocument();
		});

		it("renders Merge (fast-forward) label when FF possible", () => {
			renderDetail({
				mergeStatus: makeMergeStatus({ fastForward: true }),
			});
			expect(
				screen.getByRole("button", { name: /fast-forward/i }),
			).toBeInTheDocument();
		});

		it("renders Create merge commit button when FF possible", () => {
			renderDetail({
				mergeStatus: makeMergeStatus({ fastForward: true }),
			});
			expect(
				screen.getByRole("button", { name: /Create merge commit/i }),
			).toBeInTheDocument();
		});

		it("does not render merge buttons when PR is not open", () => {
			renderDetail({
				pullRequest: makePR({ status: "merged" }),
			});
			expect(
				screen.queryByRole("button", { name: /^merge$/i }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /fast-forward/i }),
			).not.toBeInTheDocument();
		});

		it("shows loading state on merge buttons when merging", () => {
			renderDetail({
				mergeStatus: makeMergeStatus({ conflicts: false }),
				merging: true,
			});
			const buttons = screen.getAllByRole("button", { name: /merge/i });
			expect(buttons.some((b) => b.hasAttribute("disabled"))).toBe(true);
		});

		it("calls onMerge(true) when FF Merge button clicked", async () => {
			const onMerge = vi.fn();
			const user = userEvent.setup();
			renderDetail({
				mergeStatus: makeMergeStatus({ fastForward: true }),
				onMerge,
			});
			await user.click(screen.getByRole("button", { name: /fast-forward/i }));
			expect(onMerge).toHaveBeenCalledWith(true);
		});

		it("calls onMerge(false) when Create merge commit button clicked", async () => {
			const onMerge = vi.fn();
			const user = userEvent.setup();
			renderDetail({
				mergeStatus: makeMergeStatus({ fastForward: true }),
				onMerge,
			});
			await user.click(
				screen.getByRole("button", { name: /Create merge commit/i }),
			);
			expect(onMerge).toHaveBeenCalledWith(false);
		});

		it("calls onMerge(false) when non-FF Merge button clicked", async () => {
			const onMerge = vi.fn();
			const user = userEvent.setup();
			renderDetail({
				mergeStatus: makeMergeStatus({ conflicts: false, fastForward: false }),
				onMerge,
			});
			await user.click(screen.getByRole("button", { name: /^merge$/i }));
			expect(onMerge).toHaveBeenCalledWith(false);
		});
	});
});
