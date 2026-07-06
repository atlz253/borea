import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./Header", () => ({
	default: ({
		opened,
		onBurgerClick,
	}: {
		opened: boolean;
		onBurgerClick: () => void;
	}) => (
		<header data-testid="header">
			<span data-testid="header-opened">{String(opened)}</span>
			<button type="button" data-testid="header-burger" onClick={onBurgerClick}>
				burger
			</button>
		</header>
	),
}));

vi.mock("./Sidebar", () => ({
	default: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

vi.mock("./Footer", () => ({
	default: () => <footer data-testid="footer">Footer</footer>,
}));

import AppShellLayout from "./AppShellLayout";

const USER = {
	id: "00000000-0000-4000-8000-000000000001",
	name: "Test User",
	email: "test@example.com",
	createdAt: new Date(0).toISOString(),
};

function renderLayout(
	props: { children?: React.ReactNode; authMode?: "full" | "noauth" } = {},
) {
	const { children, authMode } = { authMode: "full" as const, ...props };
	return render(
		<MantineProvider>
			<AppShellLayout user={USER} authMode={authMode}>
				{children ?? <p>Content</p>}
			</AppShellLayout>
		</MantineProvider>,
	);
}

describe("AppShellLayout", () => {
	it("renders the Header, Sidebar, Footer, and children", () => {
		renderLayout();
		expect(screen.getByTestId("header")).toBeInTheDocument();
		expect(screen.getByTestId("sidebar")).toBeInTheDocument();
		expect(screen.getByTestId("footer")).toBeInTheDocument();
		expect(screen.getByText("Content")).toBeInTheDocument();
	});

	it("passes children through to the main area", () => {
		renderLayout({ children: <div data-testid="child">Hello</div> });
		expect(screen.getByTestId("child")).toBeInTheDocument();
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("starts with opened state closed", () => {
		renderLayout();
		expect(screen.getByTestId("header-opened").textContent).toBe("false");
	});

	it("toggles opened state when burger is clicked", async () => {
		renderLayout();
		const user = userEvent.setup();
		const headerOpened = screen.getByTestId("header-opened");
		expect(headerOpened.textContent).toBe("false");

		await user.click(screen.getByTestId("header-burger"));
		expect(headerOpened.textContent).toBe("true");

		await user.click(screen.getByTestId("header-burger"));
		expect(headerOpened.textContent).toBe("false");
	});

	it("renders noauth banner when authMode is noauth", () => {
		renderLayout({ authMode: "noauth" });
		expect(
			screen.getByText(/NoAuth mode/, { selector: "span" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(USER.name, { selector: "span" }),
		).toBeInTheDocument();
		expect(screen.getByText(/Do not use in production/)).toBeInTheDocument();
	});

	it("does not render noauth banner when authMode is full", () => {
		renderLayout();
		expect(screen.queryByText(/NoAuth mode/)).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Do not use in production/),
		).not.toBeInTheDocument();
	});
});
