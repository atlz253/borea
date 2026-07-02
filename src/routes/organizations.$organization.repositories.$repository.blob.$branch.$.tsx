import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	FileContentPage,
	getRepositoryFileFn,
	listBranchesFn,
	RepositoryError,
} from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/blob/$branch/$",
)({
	loader: ({ params }) => {
		const path = params._splat ?? "";
		return Promise.all([
			getRepositoryFileFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
					path,
					ref: params.branch,
				},
			}),
			countCommitsFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
					ref: params.branch,
				},
			}),
			listBranchesFn({
				data: {
					organizationName: params.organization,
					name: params.repository,
				},
			}),
		]).then(([file, commitCount, branches]) => {
			const selectedBranch = branches.find(
				(branch: { name: string }) => branch.name === params.branch,
			);
			if (!selectedBranch) {
				throw new Error(`Branch "${params.branch}" not found`);
			}
			return {
				file,
				commitCount,
				branches,
				selectedBranch: params.branch,
				path,
			};
		});
	},
	component: () => {
		const { organization, repository } = Route.useParams();
		const { file, commitCount, branches, selectedBranch, path } =
			Route.useLoaderData();
		return (
			<FileContentPage
				key={`${organization}:${repository}:${selectedBranch}:${path}`}
				organizationName={organization}
				name={repository}
				path={path}
				file={file}
				commitCount={commitCount}
				branches={branches}
				selectedBranch={selectedBranch}
			/>
		);
	},
	errorComponent: ({ error }) => <RepositoryError error={error} />,
});
