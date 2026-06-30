import { Button, Menu, Text } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, GitBranch } from "lucide-react";
import type { BranchInfo } from "#/modules/git";

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

	if (branches.length <= 1) {
		return null;
	}

	const handleSelect = (branch: string) => {
		const encodedBranch = encodeURIComponent(branch);
		if (toCommits) {
			navigate({
				to: "/repositories/$name/tree/$branch/commits" as const,
				params: { name: repoName, branch: encodedBranch },
			});
		} else if (currentTreePath) {
			navigate({
				to: "/repositories/$name/tree/$branch/$" as const,
				params: {
					name: repoName,
					branch: encodedBranch,
					_splat: currentTreePath,
				},
			});
		} else {
			navigate({
				to: "/repositories/$name/tree/$branch" as const,
				params: { name: repoName, branch: encodedBranch },
			});
		}
	};

	return (
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
			</Menu.Dropdown>
		</Menu>
	);
}
