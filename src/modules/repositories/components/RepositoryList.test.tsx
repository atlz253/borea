import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Repository } from "../schemas";
import RepositoryList from "./RepositoryList";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
	}: {
		children: React.ReactNode;
		to: string;
		params: Record<string, string>;
	}) => (
		<a href="/test" data-to={to} data-name={params.name}>
			{children}
		</a>
	),
}));

function makeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		name: "repo-1",
		description: undefined,
		createdAt: new Date("2024-01-01"),
		...overrides,
	};
}

function renderList(props: { repositories: Repository[] }) {
	return render(
		<MantineProvider>
			<RepositoryList repositories={props.repositories} />
		</MantineProvider>,
	);
}

describe("RepositoryList", () => {
	it("renders empty-state text when there are no repositories", () => {
		renderList({ repositories: [] });
		expect(screen.getByText("No repositories yet.")).toBeInTheDocument();
	});

	it("renders a link for each repository with correct params", () => {
		renderList({
			repositories: [makeRepo({ name: "alpha" }), makeRepo({ name: "beta" })],
		});
		const alphaLink = screen.getByText("alpha");
		const betaLink = screen.getByText("beta");
		expect(alphaLink).toBeInTheDocument();
		expect(betaLink).toBeInTheDocument();
		expect(alphaLink.closest("a")?.getAttribute("data-name")).toBe("alpha");
		expect(betaLink.closest("a")?.getAttribute("data-name")).toBe("beta");
	});

	it("links to /repositories/$name route", () => {
		renderList({ repositories: [makeRepo({ name: "alpha" })] });
		expect(
			screen.getByText("alpha").closest("a")?.getAttribute("data-to"),
		).toBe("/repositories/$name");
	});

	it("renders description when present", () => {
		renderList({
			repositories: [makeRepo({ name: "alpha", description: "First repo" })],
		});
		expect(screen.getByText("First repo")).toBeInTheDocument();
	});

	it("does not render description when missing", () => {
		renderList({
			repositories: [makeRepo({ name: "alpha", description: undefined })],
		});
		expect(screen.queryByText("First repo")).not.toBeInTheDocument();
	});
});
