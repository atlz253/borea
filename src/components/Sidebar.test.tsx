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

vi.mock("#/modules/auth", () => ({
	getCurrentUserFn: vi.fn(),
}));
vi.mock("#/modules/repositories", () => ({
	listRepositoriesFn: vi.fn(),
	listUserRepositoriesFn: vi.fn(),
}));
vi.mock("#/modules/organizations", () => ({
	listOrganizationsFn: vi.fn(),
}));
vi.mock("#/modules/tasks", () => ({
	listTaskBoardsFn: vi.fn(),
}));

import { getCurrentUserFn } from "#/modules/auth";
import { listOrganizationsFn } from "#/modules/organizations";
import {
	listRepositoriesFn,
	listUserRepositoriesFn,
} from "#/modules/repositories";
import { listTaskBoardsFn } from "#/modules/tasks";

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

const USER = {
	id: "00000000-0000-4000-8000-000000000001",
	username: "alice",
	email: "alice@example.com",
	createdAt: "2024-01-01T00:00:00.000Z",
};

const BOARDS = Array.from({ length: 6 }, (_, index) => ({
	id: `00000000-0000-4000-8000-00000000000${index}`,
	organizationName: "default",
	key: `TASK-${index + 1}`,
	name: `Board ${index + 1}`,
	description: `Board description ${index + 1}`,
	lastTaskNumber: 0,
	createdAt: new Date(2024, 0, 6 - index).toISOString(),
	updatedAt: new Date(2024, 0, 6 - index).toISOString(),
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
	const tasksRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/organizations/$organization/tasks",
	});
	const taskBoardRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/organizations/$organization/tasks/$boardKey",
	});
	const taskCardRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/organizations/$organization/tasks/$boardKey/$taskPublicId",
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([
			organizationsRoute,
			organizationRoute,
			repositoryRoute,
			pullRequestRoute,
			tasksRoute,
			taskBoardRoute,
			taskCardRoute,
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
		vi.mocked(getCurrentUserFn).mockResolvedValue({
			user: null,
			authMode: "full",
		});
		vi.mocked(listOrganizationsFn).mockResolvedValue(ORGANIZATIONS);
		vi.mocked(listRepositoriesFn).mockImplementation((options) =>
			Promise.resolve(
				(options?.data as { organizationName?: string } | undefined)
					?.organizationName === "default"
					? REPOS
					: [],
			),
		);
		vi.mocked(listUserRepositoriesFn).mockResolvedValue([]);
		vi.mocked(listTaskBoardsFn).mockResolvedValue([]);
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
		expect(listTaskBoardsFn).not.toHaveBeenCalled();
	});

	it("shows repositories for the current organization", async () => {
		vi.mocked(getCurrentUserFn).mockResolvedValue({
			user: USER,
			authMode: "full",
		});
		await renderSidebar("/organizations/default");

		expect(
			screen.getByRole("button", { name: "Repositories" }),
		).toBeInTheDocument();
		await screen.findAllByRole("button", { name: /repo-/i });
		expect(listUserRepositoriesFn).not.toHaveBeenCalled();
		expect(listRepositoriesFn).toHaveBeenCalledWith({
			data: { organizationName: "default" },
		});
		expect(listTaskBoardsFn).toHaveBeenCalledWith({
			data: { organizationName: "default" },
		});
		expect(listOrganizationsFn).toHaveBeenCalled();
	});

	it("keeps repository context on nested routes", async () => {
		vi.mocked(getCurrentUserFn).mockResolvedValue({
			user: USER,
			authMode: "full",
		});
		await renderSidebar("/organizations/default/repositories/repo-1/pulls/1");

		expect(
			screen.getByRole("button", { name: "Repositories" }),
		).toBeInTheDocument();
		const repository = await screen.findByRole("button", { name: "repo-1" });
		expect(repository.getAttribute("data-active")).toBe("true");
	});

	it("navigates from the repositories heading to the organization page", async () => {
		vi.mocked(getCurrentUserFn).mockResolvedValue({
			user: USER,
			authMode: "full",
		});
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
		beforeEach(() => {
			vi.mocked(getCurrentUserFn).mockResolvedValue({
				user: USER,
				authMode: "full",
			});
		});

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

			await waitFor(() => expect(listRepositoriesFn).toHaveBeenCalled());
			expect(
				screen.queryByRole("button", { name: /repo-/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("recent task boards list", () => {
		beforeEach(() => {
			vi.mocked(getCurrentUserFn).mockResolvedValue({
				user: USER,
				authMode: "full",
			});
			vi.mocked(listRepositoriesFn).mockResolvedValue([]);
			vi.mocked(listTaskBoardsFn).mockResolvedValue(BOARDS);
		});

		it("shows task boards for the current organization", async () => {
			await renderSidebar("/organizations/default");

			expect(screen.getByRole("button", { name: "Tasks" })).toBeInTheDocument();
			expect(
				await screen.findByRole("button", { name: "Board 1" }),
			).toBeInTheDocument();
			expect(listTaskBoardsFn).toHaveBeenCalledWith({
				data: { organizationName: "default" },
			});
		});

		it("keeps task board context on board routes", async () => {
			await renderSidebar("/organizations/default/tasks/TASK-1");

			const board = await screen.findByRole("button", { name: "Board 1" });
			expect(board.getAttribute("data-active")).toBe("true");
		});

		it("keeps task board context on card routes", async () => {
			await renderSidebar("/organizations/default/tasks/TASK-1/TASK-1-1");

			const board = await screen.findByRole("button", { name: "Board 1" });
			expect(board.getAttribute("data-active")).toBe("true");
		});

		it("shows 5 most recent task boards by default", async () => {
			await renderSidebar("/organizations/default");

			const items = await screen.findAllByRole("button", { name: /Board /i });
			expect(items).toHaveLength(5);
			expect(screen.getByText(/show more/i)).toBeInTheDocument();
			expect(screen.queryByText(/show less/i)).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Board 6" }),
			).not.toBeInTheDocument();
		});

		it("expands and collapses the task board list", async () => {
			const user = userEvent.setup();
			await renderSidebar("/organizations/default");
			await screen.findAllByRole("button", { name: /Board /i });

			await user.click(screen.getByText(/show more/i));
			expect(screen.getAllByRole("button", { name: /Board /i })).toHaveLength(
				6,
			);
			expect(screen.getByText(/show less/i)).toBeInTheDocument();

			await user.click(screen.getByText(/show less/i));
			expect(screen.getAllByRole("button", { name: /Board /i })).toHaveLength(
				5,
			);
			expect(screen.getByText(/show more/i)).toBeInTheDocument();
		});

		it("does not collapse when clicking the tasks heading", async () => {
			const user = userEvent.setup();
			await renderSidebar("/organizations/default");
			await screen.findAllByRole("button", { name: /Board /i });

			await user.click(screen.getByRole("button", { name: "Tasks" }));
			expect(screen.getAllByRole("button", { name: /Board /i })).toHaveLength(
				5,
			);
		});

		it("shows no task board links when the organization has no boards", async () => {
			vi.mocked(listTaskBoardsFn).mockResolvedValue([]);
			await renderSidebar("/organizations/default");

			await waitFor(() => expect(listTaskBoardsFn).toHaveBeenCalledOnce());
			expect(
				screen.queryByRole("button", { name: /Board /i }),
			).not.toBeInTheDocument();
		});
	});
});
