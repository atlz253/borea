import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TreeEntry } from "../schemas";
import FileList from "./FileList";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
	}: {
		children: React.ReactNode;
		params: Record<string, string>;
	}) => (
		<a
			href="/test"
			data-name={params.name}
			data-branch={params.branch}
			data-splat={params._splat}
		>
			{children}
		</a>
	),
}));

const entries: TreeEntry[] = [
	{ name: "README.md", type: "blob", mode: "100644", size: 42 },
	{ name: "src", type: "tree", mode: "040000" },
	{ name: "docs", type: "tree", mode: "040000" },
	{ name: "package.json", type: "blob", mode: "100644", size: 1024 },
];

function renderList(props: Partial<Parameters<typeof FileList>[0]> = {}) {
	return render(
		<MantineProvider>
			<FileList
				entries={entries}
				repoName="my-repo"
				currentPath=""
				branch="main"
				{...props}
			/>
		</MantineProvider>,
	);
}

describe("FileList", () => {
	it("renders all entries", () => {
		renderList();

		expect(screen.getByText("README.md")).toBeInTheDocument();
		expect(screen.getByText("src")).toBeInTheDocument();
		expect(screen.getByText("docs")).toBeInTheDocument();
		expect(screen.getByText("package.json")).toBeInTheDocument();
	});

	it("renders directories as links with correct splat and branch params", () => {
		renderList();

		const srcLink = screen.getByText("src").closest("a");
		expect(srcLink).not.toBeNull();
		expect(srcLink?.getAttribute("data-splat")).toBe("src");
		expect(srcLink?.getAttribute("data-branch")).toBe("main");
	});

	it("builds nested splat path from currentPath", () => {
		renderList({ currentPath: "src/components" });

		const docsLink = screen.getByText("docs").closest("a");
		expect(docsLink?.getAttribute("data-splat")).toBe("src/components/docs");
	});

	it("renders files as blob links", () => {
		renderList();

		const readmeLink = screen.getByText("README.md").closest("a");
		const packageLink = screen.getByText("package.json").closest("a");
		expect(readmeLink?.getAttribute("data-splat")).toBe("README.md");
		expect(packageLink?.getAttribute("data-splat")).toBe("package.json");
	});

	it("sorts directories before files", () => {
		const { container } = renderList();
		const rows = container.querySelectorAll("tbody tr");
		const names = Array.from(rows).map(
			(r) => r.querySelector("td:first-child")?.textContent?.trim() ?? "",
		);

		expect(names.indexOf("docs")).toBeLessThan(names.indexOf("README.md"));
		expect(names.indexOf("src")).toBeLessThan(names.indexOf("package.json"));
	});

	it("shows size for blobs", () => {
		renderList();

		expect(screen.getByText("42 B")).toBeInTheDocument();
		expect(screen.getByText("1.0 KB")).toBeInTheDocument();
	});
});
