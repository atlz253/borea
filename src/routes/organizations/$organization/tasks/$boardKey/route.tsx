import { createFileRoute } from "@tanstack/react-router";
import {
	getOrganizationAccessFn,
	getOrganizationFn,
} from "#/modules/organizations";
import { getTaskBoardFn, TaskBoardPage } from "#/modules/tasks";

export const Route = createFileRoute(
	"/organizations/$organization/tasks/$boardKey",
)({
	loader: async ({ params }) => {
		const [organization, access, board] = await Promise.all([
			getOrganizationFn({ data: { organizationName: params.organization } }),
			getOrganizationAccessFn({
				data: { organizationName: params.organization },
			}),
			getTaskBoardFn({
				data: {
					organizationName: params.organization,
					boardKey: params.boardKey,
				},
			}),
		]);
		return { organization, access, board };
	},
	component: () => {
		const { organization, access, board } = Route.useLoaderData();
		return (
			<TaskBoardPage
				board={board}
				canManage={access.canManageTasks}
				organizationName={organization.name}
			/>
		);
	},
});
