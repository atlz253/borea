import { AppShell, MantineProvider } from "@mantine/core";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

vi.mock("#/modules/repositories", () => ({
	listRepositoriesFn: vi.fn(),
}));
vi.mock("#/modules/organizations", () => ({
	listOrganizationsFn: vi.fn(),
}));

import { listOrganizationsFn } from "#/modules/organizations";
import { listRepositoriesFn } from "#/modules/repositories";

const ORGANIZATIONS = [
	{
		name: "default",
		description: "Default organization",
		createdAt: new Date("2024-01-01"),
	},
	{
		name: "other",
		description: "Other organization",
		createdAt: new Date("2024-01-02"),
	},
];

const REPOS = Array.from({ length: 6 }, (_, index) => ({
	organizationName: "default",
	name: `repo-${index + 1}`,
	description: `Description ${index + 1}`,
	createdAt: new Date(2024, 0, 6 - index),
}));

async function renderSidebar(initialEntry = "/organizations") {
	const rootRoute = createRootRoute({
		component: () => (
			<AppShell navbar={{ width: 260, breakpoint: "sm" }}>
				<AppShell.Navbar>
					<Sidebar />
				</AppShell.Navbar>
			</AppShell>
		),
	});
	const organizationsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/organizations",
	});
	const organizationRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/organizations/$organization",
	});
	const repositoryRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/organizations/$organization/repositories/$repository",
	});
	const pullRequestRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/organizations/$organization/repositories/$repository/pulls/$pullId",
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([
			organizationsRoute,
			organizationRoute,
			repositoryRoute,
			pullRequestRoute,
		]),
		history: createMemoryHistory({ initialEntries: [initialEntry] }),
	});
	await router.load();
	return render(
		<MantineProvider>
			<RouterProvider router={router} />
		</MantineProvider>,
	);
}

describe("Sidebar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(listOrganizationsFn).mockResolvedValue(ORGANIZATIONS);
		vi.mocked(listRepositoriesFn).mockResolvedValue(REPOS);
	});

	it("shows organizations on the organizations page", async () => {
		await renderSidebar();

		expect(
			screen.getByRole("button", { name: "Organizations" }),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("button", { name: "default" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "other" })).toBeInTheDocument();
		expect(listRepositoriesFn).not.toHaveBeenCalled();
	});

	it("shows repositories for the current organization", async () => {
		await renderSidebar("/organizations/default");

		expect(
			screen.getByRole("button", { name: "Repositories" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Organizations" }),
		).not.toBeInTheDocument();
		await screen.findAllByRole("button", { name: /repo-/i });
		expect(listRepositoriesFn).toHaveBeenCalledWith({
			data: { organizationName: "default" },
		});
		expect(listOrganizationsFn).not.toHaveBeenCalled();
	});

	it("keeps repository context on nested routes", async () => {
		await renderSidebar("/organizations/default/repositories/repo-1/pulls/1");

		expect(
			screen.getByRole("button", { name: "Repositories" }),
		).toBeInTheDocument();
		const repository = await screen.findByRole("button", { name: "repo-1" });
		expect(repository.getAttribute("data-active")).toBe("true");
	});

	it("navigates from the repositories heading to the organization page", async () => {
		const user = userEvent.setup();
		await renderSidebar("/organizations/default/repositories/repo-1/pulls/1");

		await user.click(screen.getByRole("button", { name: "Repositories" }));
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Repositories" }),
			).toBeInTheDocument(),
		);
	});

	describe("recent repositories list", () => {
		it("shows 5 most recent repositories by default", async () => {
			await renderSidebar("/organizations/default");

			const items = await screen.findAllByRole("button", { name: /repo-/i });
			expect(items).toHaveLength(5);
			expect(screen.getByText(/show more/i)).toBeInTheDocument();
			expect(screen.queryByText(/show less/i)).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /repo-6/i }),
			).not.toBeInTheDocument();
		});

		it("expands and collapses the repository list", async () => {
			const user = userEvent.setup();
			await renderSidebar("/organizations/default");
			await screen.findAllByRole("button", { name: /repo-/i });

			await user.click(screen.getByText(/show more/i));
			expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(6);
			expect(screen.getByText(/show less/i)).toBeInTheDocument();

			await user.click(screen.getByText(/show less/i));
			expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(5);
			expect(screen.getByText(/show more/i)).toBeInTheDocument();
		});

		it("does not collapse when clicking the repositories heading", async () => {
			const user = userEvent.setup();
			await renderSidebar("/organizations/default");
			await screen.findAllByRole("button", { name: /repo-/i });

			await user.click(screen.getByRole("button", { name: "Repositories" }));
			expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(5);
		});

		it("shows no repository links when the organization is empty", async () => {
			vi.mocked(listRepositoriesFn).mockResolvedValue([]);
			await renderSidebar("/organizations/default");

			await waitFor(() => expect(listRepositoriesFn).toHaveBeenCalledOnce());
			expect(
				screen.queryByRole("button", { name: /repo-/i }),
			).not.toBeInTheDocument();
		});
	});
});
