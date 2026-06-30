import { AppShell, MantineProvider } from "@mantine/core";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import Header from "./Header";

async function renderHeader() {
	const rootRoute = createRootRoute({
		component: () => (
			<AppShell header={{ height: 56 }}>
				<AppShell.Header>
					<Header opened={false} onBurgerClick={() => {}} />
				</AppShell.Header>
			</AppShell>
		),
	});
	const route = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([route]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	await router.load();
	return render(
		<MantineProvider>
			<RouterProvider router={router} />
		</MantineProvider>,
	);
}

it("renders the logo link", async () => {
	await renderHeader();

	const link = screen.getByRole("link", { name: "Nirvana" });
	expect(link).toBeInTheDocument();
	expect(link).toHaveAttribute("href", "/");
});

it("renders the theme toggle button", async () => {
	await renderHeader();

	expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
});

it("renders the burger toggle", async () => {
	await renderHeader();

	expect(
		screen.getByRole("button", { name: /toggle navigation/i }),
	).toBeInTheDocument();
});
