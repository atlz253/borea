import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	CreatePullRequestPage,
	createPullRequestFn,
} from "#/modules/pull-requests";
import { listBranchesFn } from "#/modules/repositories";

export const Route = createFileRoute("/repositories/$name/pulls/new")({
	loader: ({ params }) => listBranchesFn({ data: { name: params.name } }),
	component: () => {
		const { name } = Route.useParams();
		const branches = Route.useLoaderData();
		const navigate = useNavigate();
		const [submitting, setSubmitting] = useState(false);

		const handleSubmit = async (data: {
			title: string;
			sourceBranch: string;
			targetBranch: string;
		}) => {
			setSubmitting(true);
			try {
				const pr = await createPullRequestFn({
					data: {
						repoName: name,
						title: data.title,
						sourceBranch: data.sourceBranch,
						targetBranch: data.targetBranch,
					},
				});
				await navigate({
					to: "/repositories/$name/pulls/$pullId",
					params: { name, pullId: String(pr.id) },
				});
			} finally {
				setSubmitting(false);
			}
		};

		return (
			<CreatePullRequestPage
				branches={branches}
				onSubmit={handleSubmit}
				submitting={submitting}
			/>
		);
	},
});
