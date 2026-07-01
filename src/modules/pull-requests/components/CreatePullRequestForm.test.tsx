import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BranchInfo } from "#/modules/git";
import CreatePullRequestForm from "./CreatePullRequestForm";

vi.mock("@mantine/core", async (importOriginal) => {
	const actual =
		await importOriginal<Record<string, (...args: unknown[]) => unknown>>();
	return {
		...actual,
		Select: ({
			label,
			data,
			value,
			onChange,
			placeholder,
		}: {
			label?: string;
			data: Array<{ value: string; label: string }>;
			value: string;
			onChange: (val: string | null) => void;
			placeholder?: string;
		}) => (
			<label>
				{label}
				<select
					value={value ?? ""}
					onChange={(e) =>
						onChange(e.target.value === "" ? null : e.target.value)
					}
				>
					{placeholder && <option value="">{placeholder}</option>}
					{data.map((d) => (
						<option key={d.value} value={d.value}>
							{d.label}
						</option>
					))}
				</select>
			</label>
		),
	};
});

const branches: BranchInfo[] = [
	{ name: "main", isHead: true },
	{ name: "develop", isHead: false },
	{ name: "feature/x", isHead: false },
];

interface Props {
	branches?: BranchInfo[];
	onSubmit?: (data: {
		title: string;
		sourceBranch: string;
		targetBranch: string;
	}) => Promise<void>;
	submitting?: boolean;
}

function renderForm(props: Props = {}) {
	const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
	render(
		<MantineProvider>
			<CreatePullRequestForm
				branches={props.branches ?? branches}
				onSubmit={
					onSubmit as unknown as (data: {
						title: string;
						sourceBranch: string;
						targetBranch: string;
					}) => Promise<void>
				}
				submitting={props.submitting ?? false}
			/>
		</MantineProvider>,
	);
	return {
		onSubmit: onSubmit as unknown as ReturnType<typeof vi.fn>,
	};
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/Title/i), "Add feature");
	await user.selectOptions(
		screen.getByLabelText(/Source branch/i),
		"feature/x",
	);
	await user.selectOptions(screen.getByLabelText(/Target branch/i), "main");
}

describe("CreatePullRequestForm", () => {
	it("defaults target branch to the head branch", () => {
		renderForm();
		const target = screen.getByLabelText(/Target branch/i) as HTMLSelectElement;
		expect(target.value).toBe("main");
	});

	it("defaults target branch to first branch when no head branch", () => {
		renderForm({
			branches: [
				{ name: "alpha", isHead: false },
				{ name: "beta", isHead: false },
			],
		});
		const target = screen.getByLabelText(/Target branch/i) as HTMLSelectElement;
		expect(target.value).toBe("alpha");
	});

	it("renders submit button", () => {
		renderForm();
		expect(
			screen.getByRole("button", { name: /create pull request/i }),
		).toBeInTheDocument();
	});

	it("does not call onSubmit when title is empty", async () => {
		const { onSubmit } = renderForm();
		const user = userEvent.setup();

		await user.selectOptions(
			screen.getByLabelText(/Source branch/i),
			"feature/x",
		);
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(screen.getByText("Title is required")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("does not call onSubmit when source branch is empty", async () => {
		const { onSubmit } = renderForm();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/Title/i), "Title here");
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(screen.getByText("Source branch is required")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("does not call onSubmit when target branch is empty", async () => {
		const { onSubmit } = renderForm();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/Title/i), "Title here");
		await user.selectOptions(
			screen.getByLabelText(/Source branch/i),
			"feature/x",
		);
		await user.selectOptions(screen.getByLabelText(/Target branch/i), "");
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(screen.getByText("Target branch is required")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("does not call onSubmit when source equals target", async () => {
		const { onSubmit } = renderForm();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/Title/i), "Title here");
		await user.selectOptions(
			screen.getByLabelText(/Source branch/i),
			"feature/x",
		);
		await user.selectOptions(
			screen.getByLabelText(/Target branch/i),
			"feature/x",
		);
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(
			screen.getByText("Source and target branches must be different"),
		).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("calls onSubmit with trimmed title and selected branches on valid submission", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		renderForm({ onSubmit });
		const user = userEvent.setup();

		await fillValidForm(user);
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(onSubmit).toHaveBeenCalledWith({
			title: "Add feature",
			sourceBranch: "feature/x",
			targetBranch: "main",
		});
	});

	it("renders submitting state on button when submitting prop is true", () => {
		renderForm({ submitting: true });
		const button = screen.getByRole("button", {
			name: /create pull request/i,
		});
		expect(button).toBeDisabled();
	});

	it("shows error message when onSubmit rejects with Error", async () => {
		const onSubmit = vi.fn().mockRejectedValue(new Error("Branch not found"));
		renderForm({ onSubmit });
		const user = userEvent.setup();

		await fillValidForm(user);
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(await screen.findByText("Branch not found")).toBeInTheDocument();
	});

	it("shows generic error message when onSubmit rejects with non-Error", async () => {
		const onSubmit = vi.fn().mockRejectedValue("oops");
		renderForm({ onSubmit });
		const user = userEvent.setup();

		await fillValidForm(user);
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(await screen.findByText("Failed to create PR")).toBeInTheDocument();
	});

	it("clears the error when user starts editing a field after failure", async () => {
		const onSubmit = vi.fn().mockRejectedValue(new Error("Branch not found"));
		renderForm({ onSubmit });
		const user = userEvent.setup();

		await fillValidForm(user);
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);
		expect(await screen.findByText("Branch not found")).toBeInTheDocument();

		await user.type(screen.getByLabelText(/Title/i), "x");
		expect(screen.queryByText("Branch not found")).not.toBeInTheDocument();
	});

	it("trims whitespace-only title to empty and triggers required error", async () => {
		const { onSubmit } = renderForm();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/Title/i), "   ");
		await user.selectOptions(
			screen.getByLabelText(/Source branch/i),
			"feature/x",
		);
		await user.click(
			screen.getByRole("button", { name: /create pull request/i }),
		);

		expect(screen.getByText("Title is required")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});
});
