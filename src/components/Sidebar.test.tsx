import { AppShell, MantineProvider } from "@mantine/core";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

vi.mock("#/modules/repositories", () => ({
	listRepositoriesFn: vi.fn(),
}));
vi.mock("#/modules/organizations", () => ({
	listOrganizationsFn: vi.fn().mockResolvedValue([{ name: "default" }]),
}));

import { listRepositoriesFn } from "#/modules/repositories";

const REPOS = Array.from({ length: 6 }, (_, i) => ({
	organizationName: "default",
	name: `repo-${i + 1}`,
	description: `Description ${i + 1}`,
	createdAt: new Date(2024, 0, 6 - i),
}));

async function renderSidebar() {
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
	const route = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([route, organizationsRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	await router.load();
	return render(
		<MantineProvider>
			<RouterProvider router={router} />
		</MantineProvider>,
	);
}

it("renders the organizations button", async () => {
	vi.mocked(listRepositoriesFn).mockResolvedValueOnce([]);

	await renderSidebar();

	const button = screen.getByRole("button", { name: /organizations/i });
	expect(button).toBeInTheDocument();
});

describe("recent repositories list", () => {
	it("shows 5 most recent repositories by default", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValueOnce(REPOS);

		await renderSidebar();

		const items = await screen.findAllByRole("button", { name: /repo-/i });
		expect(items).toHaveLength(5);
		expect(screen.getByText(/show more/i)).toBeInTheDocument();
		expect(screen.queryByText(/show less/i)).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /repo-6/i }),
		).not.toBeInTheDocument();
	});

	it("expands to show all repositories on show more click", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValueOnce(REPOS);
		const user = userEvent.setup();

		await renderSidebar();

		await screen.findAllByRole("button", { name: /repo-/i });

		await user.click(screen.getByText(/show more/i));

		const allItems = screen.getAllByRole("button", { name: /repo-/i });
		expect(allItems).toHaveLength(6);
		expect(screen.getByText(/show less/i)).toBeInTheDocument();
		expect(screen.queryByText(/show more/i)).not.toBeInTheDocument();
	});

	it("collapses back to 5 on show less click", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValueOnce(REPOS);
		const user = userEvent.setup();

		await renderSidebar();

		await screen.findAllByRole("button", { name: /repo-/i });

		await user.click(screen.getByText(/show more/i));
		expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(6);

		await user.click(screen.getByText(/show less/i));

		expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(5);
		expect(screen.getByText(/show more/i)).toBeInTheDocument();
		expect(screen.queryByText(/show less/i)).not.toBeInTheDocument();
	});

	it("does not collapse when clicking the organizations button", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValueOnce(REPOS);
		const user = userEvent.setup();

		await renderSidebar();

		const items = await screen.findAllByRole("button", { name: /repo-/i });
		expect(items).toHaveLength(5);

		await user.click(screen.getByRole("button", { name: /organizations/i }));

		expect(screen.getAllByRole("button", { name: /repo-/i })).toHaveLength(5);
	});

	it("shows nothing when no repositories exist", async () => {
		vi.mocked(listRepositoriesFn).mockResolvedValueOnce([]);

		await renderSidebar();

		expect(
			screen.queryByRole("button", { name: /repo-/i }),
		).not.toBeInTheDocument();
	});
});
