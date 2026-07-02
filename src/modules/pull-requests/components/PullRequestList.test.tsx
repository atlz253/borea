import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PullRequest } from "../schemas";
import PullRequestList from "./PullRequestList";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
	}: {
		children: React.ReactNode;
		to: string;
		params: Record<string, string>;
	}) => (
		<a
			href="/test"
			data-to={to}
			data-name={params.repository}
			data-pull-id={params.pullId}
		>
			{children}
		</a>
	),
}));

function makePR(overrides: Partial<PullRequest> = {}): PullRequest {
	return {
		id: 1,
		organizationName: "default",
		repoName: "my-repo",
		title: "PR title",
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

function renderList(props: { repoName?: string; pullRequests: PullRequest[] }) {
	return render(
		<MantineProvider>
			<PullRequestList
				repoName={props.repoName ?? "my-repo"}
				pullRequests={props.pullRequests}
			/>
		</MantineProvider>,
	);
}

describe("PullRequestList", () => {
	it("renders empty-state text when no pull requests", () => {
		renderList({ pullRequests: [] });
		expect(screen.getByText("No pull requests yet.")).toBeInTheDocument();
	});

	it("renders table headers when pull requests exist", () => {
		renderList({ pullRequests: [makePR()] });
		expect(screen.getByText("Title")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();
		expect(screen.getByText("Branches")).toBeInTheDocument();
		expect(screen.getByText("Author")).toBeInTheDocument();
		expect(screen.getByText("Created")).toBeInTheDocument();
	});

	it("renders PR title link with correct params", () => {
		renderList({
			repoName: "my-repo",
			pullRequests: [makePR({ id: 7, title: "Fix bug" })],
		});
		const link = screen.getByText("Fix bug").closest("a");
		expect(link?.getAttribute("data-to")).toBe(
			"/organizations/$organization/repositories/$repository/pulls/$pullId",
		);
		expect(link?.getAttribute("data-name")).toBe("my-repo");
		expect(link?.getAttribute("data-pull-id")).toBe("7");
	});

	it("renders status badge for open PR", () => {
		renderList({ pullRequests: [makePR({ status: "open" })] });
		expect(screen.getByText("open")).toBeInTheDocument();
	});

	it("renders status badge for merged PR", () => {
		renderList({ pullRequests: [makePR({ status: "merged" })] });
		expect(screen.getByText("merged")).toBeInTheDocument();
	});

	it("renders status badge for closed PR", () => {
		renderList({ pullRequests: [makePR({ status: "closed" })] });
		expect(screen.getByText("closed")).toBeInTheDocument();
	});

	it("renders branch transition text", () => {
		renderList({
			pullRequests: [makePR({ sourceBranch: "feat", targetBranch: "main" })],
		});
		expect(screen.getByText(/feat/i)).toBeInTheDocument();
		expect(screen.getByText(/main/i)).toBeInTheDocument();
	});

	it("renders author name", () => {
		renderList({
			pullRequests: [makePR({ authorName: "bob" })],
		});
		expect(screen.getByText("bob")).toBeInTheDocument();
	});

	it("renders all rows for multiple PRs", () => {
		renderList({
			pullRequests: [
				makePR({ id: 1, title: "First" }),
				makePR({ id: 2, title: "Second" }),
				makePR({ id: 3, title: "Third" }),
			],
		});
		expect(screen.getByText("First")).toBeInTheDocument();
		expect(screen.getByText("Second")).toBeInTheDocument();
		expect(screen.getByText("Third")).toBeInTheDocument();
	});
});
