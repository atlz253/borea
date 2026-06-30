import { AppShell, MantineProvider } from "@mantine/core";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

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
	const repositoriesRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/repositories",
	});
	const route = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([route, repositoriesRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	await router.load();
	return render(
		<MantineProvider>
			<RouterProvider router={router} />
		</MantineProvider>,
	);
}

it("renders a link to the repositories page", async () => {
	await renderSidebar();

	const link = screen.getByRole("link", { name: /repositories/i });
	expect(link).toBeInTheDocument();
	expect(link).toHaveAttribute("href", "/repositories");
});
