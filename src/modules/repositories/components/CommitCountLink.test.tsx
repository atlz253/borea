import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommitCountLink from "./CommitCountLink";

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
			data-branch={params.branch}
		>
			{children}
		</a>
	),
}));

function renderLink(
	props: Partial<Parameters<typeof CommitCountLink>[0]> = {},
) {
	return render(
		<MantineProvider>
			<CommitCountLink
				repoName="my-repo"
				count={1}
				branchName="main"
				{...props}
			/>
		</MantineProvider>,
	);
}

describe("CommitCountLink", () => {
	it("renders singular label for count === 1", () => {
		renderLink({ count: 1 });
		expect(screen.getByText("1 commit")).toBeInTheDocument();
	});

	it("renders plural label for count > 1", () => {
		renderLink({ count: 42 });
		expect(screen.getByText("42 commits")).toBeInTheDocument();
	});

	it("renders plural label for count === 0", () => {
		renderLink({ count: 0 });
		expect(screen.getByText("0 commits")).toBeInTheDocument();
	});

	it("links to the commit list route with repo name and encoded branch", () => {
		renderLink({ repoName: "my-repo", branchName: "main" });
		const link = screen.getByRole("link");
		expect(link.getAttribute("data-to")).toBe(
			"/organizations/$organization/repositories/$repository/tree/$branch/commits",
		);
		expect(link.getAttribute("data-name")).toBe("my-repo");
		expect(link.getAttribute("data-branch")).toBe("main");
	});

	it("encodes slashes in branch name", () => {
		renderLink({ branchName: "feature/login" });
		expect(screen.getByRole("link").getAttribute("data-branch")).toBe(
			"feature%2Flogin",
		);
	});
});
