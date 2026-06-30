import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import RepositoriesPage from "./RepositoriesPage";

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
