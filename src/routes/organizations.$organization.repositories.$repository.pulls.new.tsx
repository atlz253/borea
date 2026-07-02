import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	CreatePullRequestPage,
	createPullRequestFn,
} from "#/modules/pull-requests";
import { listBranchesFn } from "#/modules/repositories";

export const Route = createFileRoute(
	"/organizations/$organization/repositories/$repository/pulls/new",
)({
	loader: ({ params }) =>
		listBranchesFn({
			data: {
				organizationName: params.organization,
				name: params.repository,
			},
		}),
	component: () => {
		const { organization, repository } = Route.useParams();
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
						organizationName: organization,
						repoName: repository,
						title: data.title,
						sourceBranch: data.sourceBranch,
						targetBranch: data.targetBranch,
					},
				});
				await navigate({
					to: "/organizations/$organization/repositories/$repository/pulls/$pullId",
					params: {
						organization,
						repository,
						pullId: String(pr.id),
					},
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
