import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

process.env.AUTH_MODE ??= "noauth";
process.env.LOG_LEVEL ??= "silent";

afterEach(() => {
	cleanup();
});

if (typeof window !== "undefined" && !window.ResizeObserver) {
	class ResizeObserverStub {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	window.ResizeObserver =
		ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof window !== "undefined" && !window.matchMedia) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}

if (typeof window !== "undefined" && !window.visualViewport) {
	Object.defineProperty(window, "visualViewport", {
		writable: true,
		value: {
			addEventListener: () => {},
			removeEventListener: () => {},
		},
	});
}

if (typeof document !== "undefined" && !document.fonts) {
	Object.defineProperty(document, "fonts", {
		value: {
			addEventListener: () => {},
			removeEventListener: () => {},
		},
	});
}
