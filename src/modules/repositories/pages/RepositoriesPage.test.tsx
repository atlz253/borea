import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import RepositoriesPage from "./RepositoriesPage";

vi.mock("../server/repository.functions", () => ({
	createRepositoryFn: vi.fn(),
}));

it("renders the repositories heading", () => {
	render(
		<MantineProvider>
			<RepositoriesPage repositories={[]} />
		</MantineProvider>,
	);

	expect(screen.getByRole("heading", { name: "default" })).toBeInTheDocument();
});

it("shows the new repository button", () => {
	render(
		<MantineProvider>
			<RepositoriesPage repositories={[]} />
		</MantineProvider>,
	);

	expect(
		screen.getByRole("button", { name: /new repository/i }),
	).toBeInTheDocument();
});
