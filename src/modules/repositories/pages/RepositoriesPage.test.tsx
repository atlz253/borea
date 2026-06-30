import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import RepositoriesPage from "./RepositoriesPage";

vi.mock("../server/repository.functions", () => ({
	createRepositoryFn: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => {
	const mockUseLoaderData = vi.fn(() => []);
	return {
		getRouteApi: () => ({
			useLoaderData: mockUseLoaderData,
		}),
	};
});

it("renders the repositories heading", () => {
	render(
		<MantineProvider>
			<RepositoriesPage />
		</MantineProvider>,
	);

	expect(
		screen.getByRole("heading", { name: /repositories/i }),
	).toBeInTheDocument();
});

it("shows the new repository button", () => {
	render(
		<MantineProvider>
			<RepositoriesPage />
		</MantineProvider>,
	);

	expect(
		screen.getByRole("button", { name: /new repository/i }),
	).toBeInTheDocument();
});
