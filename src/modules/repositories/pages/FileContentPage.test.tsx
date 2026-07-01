import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FileContent } from "#/modules/git";
import { FILE_OPEN_MAX_BYTES, FILE_PREVIEW_MAX_BYTES } from "../file-limits";
import { getRepositoryFileFn } from "../server/repository.functions";
import FileContentPage from "./FileContentPage";

vi.mock("@mantine/code-highlight", () => ({
	CodeHighlight: ({
		code,
		language,
		codeColorScheme,
	}: {
		code: string;
		language: string;
		codeColorScheme?: string;
	}) => (
		<pre data-language={language} data-code-color-scheme={codeColorScheme}>
			{code}
		</pre>
	),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
	}: {
		children: React.ReactNode;
		params: Record<string, string>;
	}) => (
		<a href="/test" data-splat={params._splat}>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
}));

vi.mock("../server/repository.functions", () => ({
	getRepositoryFileFn: vi.fn(),
}));

const branches = [{ name: "main", isHead: true }];

function renderPage(file: FileContent, path = "src/index.ts") {
	return render(
		<MantineProvider>
			<FileContentPage
				name="my-repo"
				path={path}
				file={file}
				commitCount={1}
				branches={branches}
				selectedBranch="main"
			/>
		</MantineProvider>,
	);
}

describe("FileContentPage", () => {
	it("highlights a small text file and renders directory breadcrumbs", () => {
		renderPage({
			status: "text",
			path: "src/index.ts",
			size: 24,
			content: "export const value = 1;\n",
		});

		expect(screen.getByText("export const value = 1;")).toHaveAttribute(
			"data-language",
			"typescript",
		);
		expect(screen.getByText("export const value = 1;")).not.toHaveAttribute(
			"data-code-color-scheme",
		);
		expect(screen.getByRole("link", { name: "src" })).toHaveAttribute(
			"data-splat",
			"src",
		);
	});

	it("opens a large file as plaintext after confirmation", async () => {
		const size = FILE_PREVIEW_MAX_BYTES + 1;
		vi.mocked(getRepositoryFileFn).mockResolvedValue({
			status: "text",
			path: "large.ts",
			size,
			content: "export const large = true;",
		});
		renderPage({ status: "too-large", path: "large.ts", size }, "large.ts");

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Open file" }));

		expect(getRepositoryFileFn).toHaveBeenCalledWith({
			data: {
				name: "my-repo",
				path: "large.ts",
				ref: "main",
				loadLarge: true,
			},
		});
		expect(
			await screen.findByText("export const large = true;"),
		).toHaveAttribute("data-language", "plaintext");
	});

	it("does not offer opening a file over 25 MiB", () => {
		renderPage(
			{
				status: "too-large",
				path: "huge.txt",
				size: FILE_OPEN_MAX_BYTES + 1,
			},
			"huge.txt",
		);

		expect(screen.getByText(/larger than 25 MiB/)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Open file" })).toBeNull();
	});

	it("shows a binary-file message", () => {
		renderPage({ status: "binary", path: "image.png", size: 128 }, "image.png");

		expect(screen.getByText("Binary files cannot be displayed.")).toBeVisible();
	});
});
