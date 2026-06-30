import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";

function Wrapper({ children }: { children: React.ReactNode }) {
	return <MantineProvider>{children}</MantineProvider>;
}

beforeEach(() => {
	window.localStorage.clear();
});

it("renders the toggle button with auto mode initially", () => {
	render(<ThemeToggle />, { wrapper: Wrapper });

	const button = screen.getByRole("button");
	expect(button).toBeInTheDocument();
	expect(button).toHaveTextContent("Auto");
});

it("cycles through light, dark, and auto modes on click", async () => {
	const user = userEvent.setup();
	render(<ThemeToggle />, { wrapper: Wrapper });

	const button = screen.getByRole("button");

	await user.click(button);
	expect(button).toHaveTextContent("Light");
	expect(window.localStorage.getItem("mantine-color-scheme-value")).toBe(
		"light",
	);

	await user.click(button);
	expect(button).toHaveTextContent("Dark");
	expect(window.localStorage.getItem("mantine-color-scheme-value")).toBe(
		"dark",
	);

	await user.click(button);
	expect(button).toHaveTextContent("Auto");
	expect(window.localStorage.getItem("mantine-color-scheme-value")).toBe(
		"auto",
	);
});

it("persists stored theme mode", () => {
	window.localStorage.setItem("mantine-color-scheme-value", "light");
	render(<ThemeToggle />, { wrapper: Wrapper });

	const button = screen.getByRole("button");
	expect(button).toHaveTextContent("Light");
});
