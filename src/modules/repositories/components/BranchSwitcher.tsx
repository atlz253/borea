import { Button, Group, Menu, Modal, Text, TextInput } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import {
	Check,
	ChevronDown,
	GitBranch,
	GitBranchPlus,
	Pencil,
} from "lucide-react";
import { useState } from "react";
import type { BranchInfo } from "#/modules/git";
import { useRepositoryAccess } from "#/modules/organizations";
import { createBranchFn, renameBranchFn } from "#/modules/repositories";
import * as m from "#/paraglide/messages";

interface BranchSwitcherProps {
	organizationName?: string;
	userName?: string;
	repoName: string;
	branches: BranchInfo[];
	selectedBranch: string;
	currentTreePath?: string;
	currentBlobPath?: string;
	toCommits?: boolean;
}

function branchRoute(
	userName: string | undefined,
	toCommits: boolean | undefined,
	currentBlobPath: string | undefined,
	currentTreePath: string | undefined,
) {
	if (toCommits) {
		return userName
			? "/users/$username/repositories/$repository/tree/$branch/commits"
			: "/organizations/$organization/repositories/$repository/tree/$branch/commits";
	}
	if (currentBlobPath) {
		return userName
			? "/users/$username/repositories/$repository/blob/$branch/$"
			: "/organizations/$organization/repositories/$repository/blob/$branch/$";
	}
	if (currentTreePath) {
		return userName
			? "/users/$username/repositories/$repository/tree/$branch/$"
			: "/organizations/$organization/repositories/$repository/tree/$branch/$";
	}
	return userName
		? "/users/$username/repositories/$repository/tree/$branch"
		: "/organizations/$organization/repositories/$repository/tree/$branch";
}

function branchParams({
	organizationName,
	userName,
	repoName,
	branch,
	currentBlobPath,
	currentTreePath,
}: {
	organizationName: string;
	userName?: string;
	repoName: string;
	branch: string;
	currentBlobPath?: string;
	currentTreePath?: string;
}) {
	const path = currentBlobPath ?? currentTreePath;
	const scoped = userName
		? { username: userName, repository: repoName, branch }
		: { organization: organizationName, repository: repoName, branch };
	return path ? { ...scoped, _splat: path } : scoped;
}

export default function BranchSwitcher({
	organizationName = "default",
	userName,
	repoName,
	branches,
	selectedBranch,
	currentTreePath,
	currentBlobPath,
	toCommits,
}: BranchSwitcherProps) {
	const access = useRepositoryAccess();
	const navigate = useNavigate();
	const [opened, setOpened] = useState(false);
	const [renameOpened, setRenameOpened] = useState(false);
	const [newBranchName, setNewBranchName] = useState("");
	const [renameNewName, setRenameNewName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	if (branches.length === 0) {
		return null;
	}

	const navigateToBranch = (branch: string) => {
		const encodedBranch = encodeURIComponent(branch);
		void navigate({
			to: branchRoute(
				userName,
				toCommits,
				currentBlobPath,
				currentTreePath,
			) as never,
			params: branchParams({
				organizationName,
				userName,
				repoName,
				branch: encodedBranch,
				currentBlobPath,
				currentTreePath,
			}) as never,
		});
	};

	const handleCreate = async () => {
		setError(null);
		setLoading(true);
		try {
			await createBranchFn({
				data: {
					organizationName,
					userName,
					name: repoName,
					branch: newBranchName,
					from: selectedBranch,
				},
			});
			setOpened(false);
			setNewBranchName("");
			navigateToBranch(newBranchName);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.repositories_branchSwitcher_error_create(),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleRename = async () => {
		setError(null);
		setLoading(true);
		try {
			await renameBranchFn({
				data: {
					organizationName,
					userName,
					name: repoName,
					oldName: selectedBranch,
					newName: renameNewName,
				},
			});
			setRenameOpened(false);
			setRenameNewName("");
			navigateToBranch(renameNewName);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.repositories_branchSwitcher_error_rename(),
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Menu shadow="md" width={220} withinPortal={false}>
				<Menu.Target>
					<Button
						variant="subtle"
						size="sm"
						leftSection={<GitBranch size={16} />}
						rightSection={<ChevronDown size={14} />}
					>
						<Text size="sm" fw={500}>
							{selectedBranch}
						</Text>
					</Button>
				</Menu.Target>
				<Menu.Dropdown>
					{branches.map((branch) => (
						<Menu.Item
							key={branch.name}
							leftSection={
								branch.name === selectedBranch ? <Check size={14} /> : undefined
							}
							onClick={() => navigateToBranch(branch.name)}
						>
							<Text size="sm">{branch.name}</Text>
						</Menu.Item>
					))}
					{access.canWrite && (
						<>
							<Menu.Divider />
							<Menu.Item
								leftSection={<Pencil size={14} />}
								onClick={() => {
									setRenameNewName("");
									setError(null);
									setRenameOpened(true);
								}}
							>
								<Text size="sm">
									{m.repositories_branchSwitcher_rename_menu()}
								</Text>
							</Menu.Item>
							<Menu.Item
								leftSection={<GitBranchPlus size={14} />}
								onClick={() => {
									setNewBranchName("");
									setError(null);
									setOpened(true);
								}}
							>
								<Text size="sm">
									{m.repositories_branchSwitcher_create_menu()}
								</Text>
							</Menu.Item>
						</>
					)}
				</Menu.Dropdown>
			</Menu>

			<Modal
				opened={opened}
				onClose={() => setOpened(false)}
				title={m.repositories_branchSwitcher_create_title()}
				size="sm"
			>
				<TextInput
					label={m.repositories_branchSwitcher_name_label()}
					placeholder={m.repositories_branchSwitcher_placeholder()}
					value={newBranchName}
					onChange={(e) => {
						setNewBranchName(e.currentTarget.value);
						setError(null);
					}}
					data-autofocus
					error={error}
					mb="md"
				/>
				<Text size="sm" c="dimmed" mb="md">
					{m.repositories_branchSwitcher_from_prefix()}
					<strong>{selectedBranch}</strong>
				</Text>
				<Group justify="flex-end">
					<Button variant="default" onClick={() => setOpened(false)}>
						{m.repositories_branchSwitcher_cancel_button()}
					</Button>
					<Button onClick={handleCreate} loading={loading}>
						{m.repositories_branchSwitcher_create_button()}
					</Button>
				</Group>
			</Modal>

			<Modal
				opened={renameOpened}
				onClose={() => {
					if (loading) return;
					setRenameOpened(false);
					setRenameNewName("");
					setError(null);
				}}
				title={m.repositories_branchSwitcher_rename_title()}
				size="sm"
			>
				<TextInput
					label={m.repositories_branchSwitcher_newName_label()}
					placeholder={m.repositories_branchSwitcher_rename_placeholder()}
					value={renameNewName}
					onChange={(e) => {
						setRenameNewName(e.currentTarget.value);
						setError(null);
					}}
					data-autofocus
					error={error}
					mb="md"
				/>
				<Text size="sm" c="dimmed" mb="md">
					{m.repositories_branchSwitcher_renaming_prefix()}
					<strong>{selectedBranch}</strong>
				</Text>
				<Group justify="flex-end">
					<Button
						variant="default"
						onClick={() => {
							setRenameOpened(false);
							setRenameNewName("");
							setError(null);
						}}
						disabled={loading}
					>
						{m.repositories_branchSwitcher_cancel_button()}
					</Button>
					<Button
						onClick={handleRename}
						loading={loading}
						disabled={!renameNewName}
					>
						{m.repositories_branchSwitcher_rename_button()}
					</Button>
				</Group>
			</Modal>
		</>
	);
}
