import { createFileRoute } from "@tanstack/react-router";
import {
	countCommitsFn,
	FileContentPage,
	getRepositoryFileFn,
	listBranchesFn,
	RepositoryError,
} from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/blob/$branch/$")({
	loader: ({ params }) => {
		const path = params._splat ?? "";
		return Promise.all([
			getRepositoryFileFn({
				data: {
					name: params.name,
					path,
					ref: params.branch,
				},
			}),
			countCommitsFn({ data: { name: params.name, ref: params.branch } }),
			listBranchesFn({ data: { name: params.name } }),
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
		const { name } = Route.useParams();
		const { file, commitCount, branches, selectedBranch, path } =
			Route.useLoaderData();
		return (
			<FileContentPage
				key={`${name}:${selectedBranch}:${path}`}
				name={name}
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
