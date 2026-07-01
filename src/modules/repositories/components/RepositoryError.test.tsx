import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RepositoryError from "./RepositoryError";

function renderError(props: { error: unknown }) {
	return render(
		<MantineProvider>
			<RepositoryError error={props.error} />
		</MantineProvider>,
	);
}

describe("RepositoryError", () => {
	it("renders Error title", () => {
		renderError({ error: new Error("boom") });
		expect(screen.getByRole("heading", { name: "Error" })).toBeInTheDocument();
	});

	it("renders the error message from an Error instance", () => {
		renderError({ error: new Error("Branch not found") });
		expect(screen.getByText("Branch not found")).toBeInTheDocument();
	});

	it("renders fallback message for non-Error input", () => {
		renderError({ error: "string error" });
		expect(screen.getByText("Failed to load repository")).toBeInTheDocument();
	});

	it("renders fallback message for null error", () => {
		renderError({ error: null });
		expect(screen.getByText("Failed to load repository")).toBeInTheDocument();
	});

	it("renders fallback message for undefined error", () => {
		renderError({ error: undefined });
		expect(screen.getByText("Failed to load repository")).toBeInTheDocument();
	});
});
