import { Button, Group, Menu, Modal, Text, TextInput } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, GitBranch, GitBranchPlus } from "lucide-react";
import { useState } from "react";
import type { BranchInfo } from "#/modules/git";
import { createBranchFn } from "#/modules/repositories";

interface BranchSwitcherProps {
	repoName: string;
	branches: BranchInfo[];
	selectedBranch: string;
	currentTreePath?: string;
	toCommits?: boolean;
}

export default function BranchSwitcher({
	repoName,
	branches,
	selectedBranch,
	currentTreePath,
	toCommits,
}: BranchSwitcherProps) {
	const navigate = useNavigate();
	const [opened, setOpened] = useState(false);
	const [newBranchName, setNewBranchName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	if (branches.length === 0) {
		return null;
	}

	const handleSelect = (branch: string) => {
		const encodedBranch = encodeURIComponent(branch);
		if (toCommits) {
			void navigate({
				to: "/repositories/$name/tree/$branch/commits" as const,
				params: { name: repoName, branch: encodedBranch },
			});
		} else if (currentTreePath) {
			void navigate({
				to: "/repositories/$name/tree/$branch/$" as const,
				params: {
					name: repoName,
					branch: encodedBranch,
					_splat: currentTreePath,
				},
			});
		} else {
			void navigate({
				to: "/repositories/$name/tree/$branch" as const,
				params: { name: repoName, branch: encodedBranch },
			});
		}
	};

	const handleCreate = async () => {
		setError(null);
		setLoading(true);
		try {
			await createBranchFn({
				data: {
					name: repoName,
					branch: newBranchName,
					from: selectedBranch,
				},
			});
			setOpened(false);
			setNewBranchName("");
			const encoded = encodeURIComponent(newBranchName);
			void navigate({
				to: "/repositories/$name/tree/$branch" as const,
				params: { name: repoName, branch: encoded },
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create branch");
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
							onClick={() => handleSelect(branch.name)}
						>
							<Text size="sm">{branch.name}</Text>
						</Menu.Item>
					))}
					<Menu.Divider />
					<Menu.Item
						leftSection={<GitBranchPlus size={14} />}
						onClick={() => {
							setNewBranchName("");
							setError(null);
							setOpened(true);
						}}
					>
						<Text size="sm">New branch</Text>
					</Menu.Item>
				</Menu.Dropdown>
			</Menu>

			<Modal
				opened={opened}
				onClose={() => setOpened(false)}
				title="Create branch"
				size="sm"
			>
				<TextInput
					label="Branch name"
					placeholder="e.g. feature/awesome"
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
					From <strong>{selectedBranch}</strong>
				</Text>
				<Group justify="flex-end">
					<Button variant="default" onClick={() => setOpened(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} loading={loading}>
						Create
					</Button>
				</Group>
			</Modal>
		</>
	);
}
