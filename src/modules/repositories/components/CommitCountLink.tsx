import { Group, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GitCommitHorizontal } from "lucide-react";
import * as m from "#/paraglide/messages";

const LINK_STYLE = {
	color: "var(--mantine-color-anchor-color)",
	textDecoration: "none",
} as const;

interface CommitCountLinkProps {
	organizationName?: string;
	userName?: string;
	repoName: string;
	count: number;
	branchName: string;
}

export default function CommitCountLink({
	organizationName = "default",
	userName,
	repoName,
	count,
	branchName,
}: CommitCountLinkProps) {
	const label =
		count === 1
			? m.repositories_commitCount_one()
			: m.repositories_commitCount_other({ count });
	const encodedBranch = encodeURIComponent(branchName);

	return (
		<Link
			to={
				(userName
					? "/users/$username/repositories/$repository/tree/$branch/commits"
					: "/organizations/$organization/repositories/$repository/tree/$branch/commits") as never
			}
			params={
				(userName
					? { username: userName, repository: repoName, branch: encodedBranch }
					: {
							organization: organizationName,
							repository: repoName,
							branch: encodedBranch,
						}) as never
			}
			style={LINK_STYLE}
		>
			<Group gap={4}>
				<GitCommitHorizontal size={16} />
				<Text size="sm">{label}</Text>
			</Group>
		</Link>
	);
}
