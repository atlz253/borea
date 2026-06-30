import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TreeEntry } from "../schemas";
import RepositoryPage from "./RepositoryPage";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
	}: {
		children: React.ReactNode;
		params: Record<string, string>;
	}) => (
		<a href="/test" data-name={params.name} data-splat={params._splat}>
			{children}
		</a>
	),
}));

function renderPage(props: Partial<Parameters<typeof RepositoryPage>[0]> = {}) {
	return render(
		<MantineProvider>
			<RepositoryPage
				name="my-repo"
				path=""
				entries={[]}
				commitCount={0}
				{...props}
			/>
		</MantineProvider>,
	);
}

describe("RepositoryPage", () => {
	it("renders the repository name as heading", () => {
		renderPage();

		expect(
			screen.getByRole("heading", { name: "my-repo" }),
		).toBeInTheDocument();
	});

	it("shows empty-state when there are no entries", () => {
		renderPage({ entries: [] });

		expect(screen.getByText("This repository is empty")).toBeInTheDocument();
		expect(screen.getByText(/Make your first commit/)).toBeInTheDocument();
	});

	it("renders file list when entries exist", () => {
		const entries: TreeEntry[] = [
			{ name: "README.md", type: "blob", mode: "100644", size: 10 },
		];
		renderPage({ entries });

		expect(screen.queryByText("This repository is empty")).toBeNull();
		expect(screen.getByText("README.md")).toBeInTheDocument();
	});

	it("does not show breadcrumbs at root path", () => {
		renderPage({ path: "" });

		expect(screen.queryByText("src")).toBeNull();
	});

	it("shows breadcrumbs for nested path", () => {
		renderPage({
			path: "src/components",
			entries: [
				{ name: "Button.tsx", type: "blob", mode: "100644", size: 100 },
			],
		});

		expect(screen.getByText("src")).toBeInTheDocument();
		expect(screen.getByText("components")).toBeInTheDocument();
	});
});
