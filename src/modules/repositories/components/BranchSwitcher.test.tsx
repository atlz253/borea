import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BranchInfo } from "#/modules/git";
import BranchSwitcher from "./BranchSwitcher";

const navigateFn = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateFn,
}));

vi.mock("@mantine/core", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		Menu: Object.assign(
			({ children }: { children: React.ReactNode }) => <div>{children}</div>,
			{
				Target: ({ children }: { children: React.ReactNode }) => (
					<div>{children}</div>
				),
				Dropdown: ({ children }: { children: React.ReactNode }) => (
					<div data-testid="menu-dropdown">{children}</div>
				),
				Item: ({
					children,
					leftSection,
					onClick,
				}: {
					children: React.ReactNode;
					leftSection?: React.ReactNode;
					onClick?: () => void;
				}) => (
					<button type="button" role="menuitem" onClick={onClick}>
						{leftSection}
						{children}
					</button>
				),
			},
		),
	};
});

const branches: BranchInfo[] = [
	{ name: "main", isHead: true },
	{ name: "develop", isHead: false },
	{ name: "feature/login", isHead: false },
];

function renderSwitcher(
	props: Partial<Parameters<typeof BranchSwitcher>[0]> = {},
) {
	return render(
		<MantineProvider>
			<BranchSwitcher
				repoName="my-repo"
				branches={branches}
				selectedBranch="main"
				{...props}
			/>
		</MantineProvider>,
	);
}

describe("BranchSwitcher", () => {
	it("renders button with selected branch name", () => {
		renderSwitcher();
		expect(screen.getAllByText("main").length).toBeGreaterThanOrEqual(1);
	});

	it("returns null when there are 0 or 1 branches", () => {
		renderSwitcher({
			branches: [{ name: "main", isHead: true }],
		});
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("lists branches in the dropdown", () => {
		renderSwitcher();
		expect(screen.getByText("develop")).toBeInTheDocument();
		expect(screen.getByText("feature/login")).toBeInTheDocument();
	});

	it("shows check icon on selected branch", () => {
		renderSwitcher();
		const items = screen.getAllByRole("menuitem");
		const mainItem = items.find((i) => i.textContent === "main");
		expect(mainItem?.querySelector("svg")).toBeTruthy();
	});

	it("navigates to root tree when branch is selected", async () => {
		renderSwitcher();
		const user = userEvent.setup();

		await user.click(screen.getByText("develop"));

		expect(navigateFn).toHaveBeenCalledWith({
			to: "/repositories/$name/tree/$branch",
			params: { name: "my-repo", branch: "develop" },
		});
	});

	it("navigates to subpath tree when currentTreePath is set", async () => {
		renderSwitcher({ currentTreePath: "src/components" });
		const user = userEvent.setup();

		await user.click(screen.getByText("develop"));

		expect(navigateFn).toHaveBeenCalledWith({
			to: "/repositories/$name/tree/$branch/$",
			params: {
				name: "my-repo",
				branch: "develop",
				_splat: "src/components",
			},
		});
	});

	it("navigates to commits when toCommits is set", async () => {
		renderSwitcher({ toCommits: true });
		const user = userEvent.setup();

		await user.click(screen.getByText("develop"));

		expect(navigateFn).toHaveBeenCalledWith({
			to: "/repositories/$name/tree/$branch/commits",
			params: { name: "my-repo", branch: "develop" },
		});
	});

	it("encodes slashes in branch names", async () => {
		renderSwitcher();
		const user = userEvent.setup();

		await user.click(screen.getByText("feature/login"));

		expect(navigateFn).toHaveBeenCalledWith({
			to: "/repositories/$name/tree/$branch",
			params: { name: "my-repo", branch: "feature%2Flogin" },
		});
	});
});
