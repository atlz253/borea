import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Organization } from "#/modules/organizations";

const navigateFn = vi.fn();
const locationRef = { pathname: "/organizations" };

vi.mock("@tanstack/react-router", () => ({
	useLocation: () => locationRef,
	useNavigate: () => navigateFn,
}));

vi.mock("#/modules/organizations", () => ({
	listOrganizationsFn: vi.fn(),
}));

import { listOrganizationsFn } from "#/modules/organizations";
import SidebarRecentOrganizations from "./SidebarRecentOrganizations";

function makeOrganization(overrides: Partial<Organization> = {}): Organization {
	return {
		name: "organization-1",
		description: undefined,
		createdAt: new Date("2024-01-01"),
		...overrides,
	};
}

function makeOrganizations(count: number): Organization[] {
	return Array.from({ length: count }, (_, index) =>
		makeOrganization({
			name: `organization-${index + 1}`,
			createdAt: new Date(2024, 0, index + 1),
		}),
	);
}

function renderSidebar(opened: boolean) {
	return render(
		<MantineProvider>
			<SidebarRecentOrganizations opened={opened} />
		</MantineProvider>,
	);
}

describe("SidebarRecentOrganizations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		locationRef.pathname = "/organizations";
	});

	it("loads organizations only after opening", async () => {
		vi.mocked(listOrganizationsFn).mockResolvedValue([]);
		const { rerender } = renderSidebar(false);
		expect(listOrganizationsFn).not.toHaveBeenCalled();

		rerender(
			<MantineProvider>
				<SidebarRecentOrganizations opened />
			</MantineProvider>,
		);

		await waitFor(() => expect(listOrganizationsFn).toHaveBeenCalledOnce());
		rerender(
			<MantineProvider>
				<SidebarRecentOrganizations opened={false} />
			</MantineProvider>,
		);
		rerender(
			<MantineProvider>
				<SidebarRecentOrganizations opened />
			</MantineProvider>,
		);
		expect(listOrganizationsFn).toHaveBeenCalledOnce();
	});

	it("renders nothing for an empty organization list", async () => {
		vi.mocked(listOrganizationsFn).mockResolvedValue([]);
		renderSidebar(true);

		await waitFor(() => expect(listOrganizationsFn).toHaveBeenCalledOnce());
		expect(
			screen.queryByRole("button", { name: /organization-/i }),
		).not.toBeInTheDocument();
	});

	it("shows the five newest organizations and expands the full list", async () => {
		vi.mocked(listOrganizationsFn).mockResolvedValue(makeOrganizations(6));
		const user = userEvent.setup();
		renderSidebar(true);

		const items = await screen.findAllByRole("button", {
			name: /organization-/i,
		});
		expect(items).toHaveLength(5);
		expect(screen.getByText("organization-6")).toBeInTheDocument();
		expect(screen.queryByText("organization-1")).not.toBeInTheDocument();

		await user.click(screen.getByText("Show more"));
		expect(
			screen.getAllByRole("button", { name: /organization-/i }),
		).toHaveLength(6);
		expect(screen.getByText("Show less")).toBeInTheDocument();

		await user.click(screen.getByText("Show less"));
		expect(
			screen.getAllByRole("button", { name: /organization-/i }),
		).toHaveLength(5);
	});

	it("navigates to the selected organization", async () => {
		vi.mocked(listOrganizationsFn).mockResolvedValue([
			makeOrganization({ name: "alpha" }),
		]);
		const user = userEvent.setup();
		renderSidebar(true);

		await user.click(await screen.findByRole("button", { name: "alpha" }));
		expect(navigateFn).toHaveBeenCalledWith({
			to: "/organizations/$organization",
			params: { organization: "alpha" },
		});
	});

	it("marks the matching organization as active", async () => {
		vi.mocked(listOrganizationsFn).mockResolvedValue([
			makeOrganization({ name: "alpha" }),
		]);
		locationRef.pathname = "/organizations/alpha";
		renderSidebar(true);

		const item = await screen.findByRole("button", { name: "alpha" });
		expect(item.getAttribute("data-active")).toBe("true");
	});

	it("renders loading and error states", async () => {
		let rejectList: (reason: Error) => void = () => {};
		vi.mocked(listOrganizationsFn).mockReturnValue(
			new Promise<Organization[]>((_, reject) => {
				rejectList = reject;
			}),
		);
		renderSidebar(true);
		expect(screen.getByText("Loading...")).toBeInTheDocument();

		await act(async () => {
			rejectList(new Error("Network down"));
		});
		expect(await screen.findByText("Network down")).toBeInTheDocument();
	});

	it("renders a generic error for a non-Error rejection", async () => {
		vi.mocked(listOrganizationsFn).mockRejectedValue("failure");
		renderSidebar(true);

		expect(
			await screen.findByText("Failed to load organizations"),
		).toBeInTheDocument();
	});
});
