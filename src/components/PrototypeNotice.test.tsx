import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockShow, mockHide } = vi.hoisted(() => ({
	mockShow: vi.fn(() => "prototype-notice"),
	mockHide: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
	notifications: {
		show: mockShow,
		hide: mockHide,
	},
}));

import PrototypeNotice from "./PrototypeNotice";

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	document.removeEventListener(
		"pointerdown",
		vi.fn() as unknown as EventListener,
	);
	document.removeEventListener("keydown", vi.fn() as unknown as EventListener);
});

describe("PrototypeNotice", () => {
	it("shows a notification on mount with correct text", () => {
		render(<PrototypeNotice />);

		expect(mockShow).toHaveBeenCalledTimes(1);
		expect(mockShow).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "prototype-notice",
				title: "Prototype",
				message: expect.stringContaining("prototype"),
				position: "bottom-right",
				autoClose: false,
			}),
		);
	});

	it("hides notification on pointerdown interaction", () => {
		render(<PrototypeNotice />);

		document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

		expect(mockHide).toHaveBeenCalledWith("prototype-notice");
	});

	it("hides notification on keydown interaction", () => {
		render(<PrototypeNotice />);

		document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));

		expect(mockHide).toHaveBeenCalledWith("prototype-notice");
	});

	it("hides notification on unmount", () => {
		const { unmount } = render(<PrototypeNotice />);
		mockHide.mockClear();

		unmount();

		expect(mockHide).toHaveBeenCalledWith("prototype-notice");
	});

	it("renders nothing", () => {
		const { container } = render(<PrototypeNotice />);

		expect(container.firstChild).toBeNull();
	});
});
