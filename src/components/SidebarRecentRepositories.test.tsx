import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Repository } from "#/modules/repositories";

const navigateFn = vi.fn();
const locationRef = { pathname: "/" };

vi.mock("@tanstack/react-router", () => ({
	useLocation: () => locationRef,
	useNavigate: () => navigateFn,
}));

vi.mock("#/modules/repositories", () => ({
	listRepositoriesFn: vi.fn(),
}));
vi.mock("#/modules/organizations", () => ({
	listOrganizationsFn: vi.fn().mockResolvedValue([{ name: "default" }]),
}));

import { listRepositoriesFn } from "#/modules/repositories";
import SidebarRecentRepositories from "./SidebarRecentRepositories";

function makeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		organizationName: "default",
		name: "repo-1",
		description: undefined,
		createdAt: new Date("2024-01-01"),
		...overrides,
	};
}

function makeRepos(count: number): Repository[] {
	return Array.from({ length: count }, (_, i) =>
		makeRepo({
			name: `repo-${i + 1}`,
			createdAt: new Date(2024, 0, i + 1),
		}),
	);
}

async function renderSidebar(props: { opened: boolean }) {
	const result = render(
		<MantineProvider>
			<SidebarRecentRepositories opened={props.opened} />
		</MantineProvider>,
	);
	return result;
}

describe("SidebarRecentRepositories", () => {
	it("does not call listRepositoriesFn when opened is false", async () => {
		await renderSidebar({ opened: false });
		expect(listRepositoriesFn).not.toHaveBeenCalled();
	});

	it("calls listRepositoriesFn exactly once when opened becomes true", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue([]);
		const { rerender } = await renderSidebar({ opened: false });
		expect(listRepositoriesFn).not.toHaveBeenCalled();

		rerender(
			<MantineProvider>
				<SidebarRecentRepositories opened={true} />
			</MantineProvider>,
		);
		await waitFor(() => expect(listRepositoriesFn).toHaveBeenCalledTimes(1));

		rerender(
			<MantineProvider>
				<SidebarRecentRepositories opened={false} />
			</MantineProvider>,
		);
		rerender(
			<MantineProvider>
				<SidebarRecentRepositories opened={true} />
			</MantineProvider>,
		);
		expect(listRepositoriesFn).toHaveBeenCalledTimes(1);
	});

	it("renders nothing when list returns empty", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue([]);
		await renderSidebar({ opened: true });
		expect(
			screen.queryByRole("button", { name: /repo-/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/show more/i)).not.toBeInTheDocument();
	});

	it("renders the 5 most recent repositories sorted by createdAt DESC", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue(makeRepos(6));
		await renderSidebar({ opened: true });

		const items = await screen.findAllByRole("button", { name: /repo-/i });
		expect(items).toHaveLength(5);
		expect(screen.getByText("default/repo-6")).toBeInTheDocument();
		expect(screen.queryByText("default/repo-1")).not.toBeInTheDocument();
		expect(screen.getByText(/show more/i)).toBeInTheDocument();
	});

	it("does not render show more toggle when there are 5 or fewer repos", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue(makeRepos(3));
		await renderSidebar({ opened: true });

		expect(screen.queryByText(/show more/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/show less/i)).not.toBeInTheDocument();
	});

	it("expands to show all repos on Show more click", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue(makeRepos(6));
		const user = userEvent.setup();
		await renderSidebar({ opened: true });

		await screen.findAllByRole("button", { name: /repo-/i });
		await user.click(screen.getByText(/show more/i));

		expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(6);
		expect(screen.getByText(/show less/i)).toBeInTheDocument();
		expect(screen.queryByText(/show more/i)).not.toBeInTheDocument();
	});

	it("collapses back to 5 on Show less click", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue(makeRepos(6));
		const user = userEvent.setup();
		await renderSidebar({ opened: true });

		await screen.findAllByRole("button", { name: /repo-/i });
		await user.click(screen.getByText(/show more/i));
		await user.click(screen.getByText(/show less/i));

		expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(5);
		expect(screen.getByText(/show more/i)).toBeInTheDocument();
	});

	it("calls navigate when a repo NavLink is clicked", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue([
			makeRepo({ name: "alpha" }),
		]);
		const user = userEvent.setup();
		await renderSidebar({ opened: true });

		await screen.findByRole("button", { name: /alpha/i });
		await user.click(screen.getByRole("button", { name: /alpha/i }));

		expect(navigateFn).toHaveBeenCalledWith({
			to: "/organizations/$organization/repositories/$repository",
			params: { organization: "default", repository: "alpha" },
		});
	});

	it("marks NavLink as active when pathname matches the namespaced path", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue([
			makeRepo({ name: "alpha" }),
		]);
		locationRef.pathname = "/organizations/default/repositories/alpha";
		await renderSidebar({ opened: true });

		const item = await screen.findByRole("button", { name: /alpha/i });
		expect(item.getAttribute("data-active")).toBe("true");
	});

	it("does not mark NavLink as active when pathname mismatches", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValue([
			makeRepo({ name: "alpha" }),
		]);
		locationRef.pathname = "/organizations/default/repositories/other";
		await renderSidebar({ opened: true });

		const item = await screen.findByRole("button", { name: /alpha/i });
		expect(item.getAttribute("data-active")).not.toBe("true");
	});

	it("renders loading state while fetching", async () => {
		let resolveList: (val: Repository[]) => void = () => {};
		vi.mocked(listRepositoriesFn).mockReturnValue(
			new Promise<Repository[]>((resolve) => {
				resolveList = resolve;
			}),
		);
		await renderSidebar({ opened: true });

		expect(screen.getByText("Loading...")).toBeInTheDocument();

		await act(async () => {
			resolveList([]);
		});
	});

	it("renders error message when listRepositoriesFn rejects with Error", async () => {
		vi.mocked(listRepositoriesFn).mockRejectedValue(new Error("Network down"));
		await renderSidebar({ opened: true });

		expect(await screen.findByText("Network down")).toBeInTheDocument();
	});

	it("renders generic error message when listRepositoriesFn rejects with non-Error", async () => {
		vi.mocked(listRepositoriesFn).mockRejectedValue("oops");
		await renderSidebar({ opened: true });

		expect(
			await screen.findByText("Failed to load repositories"),
		).toBeInTheDocument();
	});
});
