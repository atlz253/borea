import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BranchInfo } from "#/modules/git";
import { createBranchFn } from "#/modules/repositories";
import BranchSwitcher from "./BranchSwitcher";

const navigateFn = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateFn,
}));

vi.mock("#/modules/repositories", () => ({
	createBranchFn: vi.fn(),
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
				Divider: () => <hr />,
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

	it("returns null when there are 0 branches", () => {
		renderSwitcher({ branches: [] });
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("renders for 1 branch with new branch option", () => {
		renderSwitcher({
			branches: [{ name: "main", isHead: true }],
		});
		expect(screen.getAllByText("main").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("New branch")).toBeInTheDocument();
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

	it("navigates to the same blob path when currentBlobPath is set", async () => {
		renderSwitcher({ currentBlobPath: "src/index.ts" });
		const user = userEvent.setup();

		await user.click(screen.getByText("develop"));

		expect(navigateFn).toHaveBeenCalledWith({
			to: "/repositories/$name/blob/$branch/$",
			params: {
				name: "my-repo",
				branch: "develop",
				_splat: "src/index.ts",
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

	it("shows New branch menu item", () => {
		renderSwitcher();
		expect(screen.getByText("New branch")).toBeInTheDocument();
	});

	it("opens modal on New branch click", async () => {
		renderSwitcher();
		const user = userEvent.setup();

		await user.click(screen.getByText("New branch"));

		expect(await screen.findByText("Create branch")).toBeInTheDocument();
	});

	it("creates branch and navigates on submit", async () => {
		vi.mocked(createBranchFn).mockResolvedValue({
			name: "new-branch",
			isHead: false,
		});
		renderSwitcher();
		const user = userEvent.setup();

		await user.click(screen.getByText("New branch"));

		const input = await screen.findByPlaceholderText("e.g. feature/awesome");
		await user.type(input, "new-branch");

		await user.click(screen.getByText("Create"));

		expect(createBranchFn).toHaveBeenCalledWith({
			data: { name: "my-repo", branch: "new-branch", from: "main" },
		});
		expect(navigateFn).toHaveBeenCalledWith({
			to: "/repositories/$name/tree/$branch",
			params: { name: "my-repo", branch: "new-branch" },
		});
	});

	it("shows error on failure", async () => {
		vi.mocked(createBranchFn).mockRejectedValue(
			new Error("Branch already exists"),
		);
		renderSwitcher();
		const user = userEvent.setup();

		await user.click(screen.getByText("New branch"));

		const input = await screen.findByPlaceholderText("e.g. feature/awesome");
		await user.type(input, "dup-branch");

		await user.click(screen.getByText("Create"));

		expect(
			await screen.findByText("Branch already exists"),
		).toBeInTheDocument();
	});
});
