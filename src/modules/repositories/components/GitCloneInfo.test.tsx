import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GitCloneInfo from "./GitCloneInfo";

vi.mock("@mantine/core", async (importOriginal) => {
	const actual =
		await importOriginal<Record<string, (...args: unknown[]) => unknown>>();
	return {
		...actual,
		CopyButton: ({
			children,
			value,
			timeout,
		}: {
			children: (state: {
				copied: boolean;
				copy: () => void;
			}) => React.ReactNode;
			value: string;
			timeout: number;
		}) => (
			<div
				data-testid="copy-button"
				data-value={value}
				data-timeout={String(timeout)}
			>
				{children({ copied: false, copy: () => {} })}
			</div>
		),
		Tooltip: ({
			children,
			label,
		}: {
			children: React.ReactNode;
			label: string;
		}) => (
			<div data-testid="tooltip" data-label={label}>
				{children}
			</div>
		),
		ActionIcon: ({
			children,
			onClick,
		}: {
			children: React.ReactNode;
			onClick?: () => void;
			[key: string]: unknown;
		}) => (
			<button type="button" data-testid="action-icon" onClick={onClick}>
				{children}
			</button>
		),
	};
});

function renderInfo(props: Partial<Parameters<typeof GitCloneInfo>[0]> = {}) {
	return render(
		<MantineProvider>
			<GitCloneInfo name={props.name ?? "my-repo"} />
		</MantineProvider>,
	);
}

describe("GitCloneInfo", () => {
	it("renders a labeled text input for the git URL", () => {
		renderInfo();
		expect(screen.getByLabelText(/Git pull URL/i)).toBeInTheDocument();
	});

	it("renders the helper description", () => {
		renderInfo();
		expect(
			screen.getByText("Clone this repository over HTTP"),
		).toBeInTheDocument();
	});

	it("initial value uses window origin plus repository name", () => {
		renderInfo({ name: "my-repo" });
		const input = screen.getByLabelText(/Git pull URL/i) as HTMLInputElement;
		expect(input.value).toBe(
			`${window.location.origin}/api/git/default/my-repo.git`,
		);
	});

	it("updates the URL when the name prop changes", () => {
		const { rerender } = renderInfo({ name: "first" });
		expect(
			(screen.getByLabelText(/Git pull URL/i) as HTMLInputElement).value,
		).toContain("/first.git");

		rerender(
			<MantineProvider>
				<GitCloneInfo name="second" />
			</MantineProvider>,
		);
		expect(
			(screen.getByLabelText(/Git pull URL/i) as HTMLInputElement).value,
		).toContain("/second.git");
	});

	it("passes the current URL and 2000ms timeout to CopyButton", () => {
		renderInfo({ name: "my-repo" });
		const copyButton = screen.getByTestId("copy-button");
		expect(copyButton.getAttribute("data-value")).toBe(
			`${window.location.origin}/api/git/default/my-repo.git`,
		);
		expect(copyButton.getAttribute("data-timeout")).toBe("2000");
	});

	it("shows initial Copy tooltip label when not copied", () => {
		renderInfo();
		expect(screen.getByTestId("tooltip").getAttribute("data-label")).toBe(
			"Copy",
		);
	});

	it("renders a read-only input", () => {
		renderInfo();
		expect(
			(screen.getByLabelText(/Git pull URL/i) as HTMLInputElement).readOnly,
		).toBe(true);
	});
});
