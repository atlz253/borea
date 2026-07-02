import { MantineProvider } from "@mantine/core";
import {
	render,
	screen,
	waitForElementToBeRemoved,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteRepositoryFn } from "../server/repository.functions";
import RepositorySettingsPage from "./RepositorySettingsPage";

vi.mock("../server/repository.functions", () => ({
	deleteRepositoryFn: vi.fn(),
}));

function renderPage(onDeleted = vi.fn()) {
	render(
		<MantineProvider>
			<RepositorySettingsPage name="my-repo" onDeleted={onDeleted} />
		</MantineProvider>,
	);
	return onDeleted;
}

async function openModal(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Delete repository" }));
	return screen.findByRole("dialog");
}

describe("RepositorySettingsPage", () => {
	beforeEach(() => {
		vi.mocked(deleteRepositoryFn).mockResolvedValue(undefined);
	});

	it("opens and closes the confirmation modal", async () => {
		const user = userEvent.setup();
		renderPage();

		const dialog = await openModal(user);
		expect(dialog).toBeInTheDocument();

		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
		await waitForElementToBeRemoved(dialog);
	});

	it("requires an exact repository name before deletion", async () => {
		const user = userEvent.setup();
		renderPage();
		const dialog = await openModal(user);
		const input = within(dialog).getByRole("textbox", {
			name: "Repository name",
		});
		const deleteButton = within(dialog).getByRole("button", {
			name: "Delete repository",
		});

		await user.type(input, "My-Repo");
		expect(deleteButton).toBeDisabled();

		await user.clear(input);
		await user.type(input, "my-repo");
		expect(deleteButton).toBeEnabled();
	});

	it("deletes the repository and invokes the success callback", async () => {
		const user = userEvent.setup();
		const onDeleted = renderPage();
		const dialog = await openModal(user);

		await user.type(
			within(dialog).getByRole("textbox", { name: "Repository name" }),
			"my-repo",
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Delete repository" }),
		);

		expect(deleteRepositoryFn).toHaveBeenCalledWith({
			data: {
				organizationName: "default",
				name: "my-repo",
				confirmation: "my-repo",
			},
		});
		expect(onDeleted).toHaveBeenCalledOnce();
	});

	it("keeps the modal open and displays deletion errors", async () => {
		const user = userEvent.setup();
		vi.mocked(deleteRepositoryFn).mockRejectedValue(
			new Error("Repository deletion failed"),
		);
		renderPage();
		const dialog = await openModal(user);

		await user.type(
			within(dialog).getByRole("textbox", { name: "Repository name" }),
			"my-repo",
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Delete repository" }),
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Repository deletion failed",
		);
		expect(dialog).toBeInTheDocument();
	});
});
