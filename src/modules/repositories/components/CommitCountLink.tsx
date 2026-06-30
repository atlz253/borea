import { Group, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitCommitHorizontal } from "lucide-react";

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

interface CommitCountLinkProps {
	repoName: string;
	count: number;
	branchName: string;
}

export default function CommitCountLink({
	repoName,
	count,
	branchName,
}: CommitCountLinkProps) {
	const label = count === 1 ? "1 commit" : `${count} commits`;
	const encodedBranch = encodeURIComponent(branchName);

	return (
		<Link
			to="/repositories/$name/tree/$branch/commits"
			params={{ name: repoName, branch: encodedBranch }}
			style={LINK_STYLE}
		>
			<Group gap={4}>
				<GitCommitHorizontal size={16} />
				<Text size="sm">{label}</Text>
			</Group>
		</Link>
	);
}
