import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

it("renders the copyright notice", () => {
	render(
		<MantineProvider>
			<Footer />
		</MantineProvider>,
	);

	const year = new Date().getFullYear();
	expect(
		screen.getByText(`© ${year} Nirvana. All rights reserved.`),
	).toBeInTheDocument();
});
