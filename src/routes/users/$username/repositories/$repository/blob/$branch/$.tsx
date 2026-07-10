import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	FileContentPage,
	getRepositoryFileFn,
	listBranchesFn,
	RepositoryError,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/users/$username/repositories/$repository/blob/$branch/$",
)({
	loader: async ({ params }) => {
		const path = params._splat ?? "";
		const [file, commitCount, branches] = await Promise.all([
			getRepositoryFileFn({
				data: {
					userName: params.username,
					name: params.repository,
					path,
					ref: params.branch,
				},
			}),
			countCommitsFn({
				data: {
					userName: params.username,
					name: params.repository,
					ref: params.branch,
				},
			}),
			listBranchesFn({
				data: { userName: params.username, name: params.repository },
			}),
		]);
		return { file, commitCount, branches, path };
	},
	component: () => {
		const { username, repository, branch } = Route.useParams();
		const { file, commitCount, branches, path } = Route.useLoaderData();
		return (
			<FileContentPage
				userName={username}
				name={repository}
				path={path}
				file={file}
				commitCount={commitCount}
				branches={branches}
				selectedBranch={branch}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
