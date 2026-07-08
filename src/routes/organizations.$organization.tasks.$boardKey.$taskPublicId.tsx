import { createFileRoute } from "@tanstack/react-router";
import {
	getOrganizationAccessFn,
	getOrganizationFn,
} from "#/modules/organizations";
import { getTaskBoardFn, getTaskCardFn, TaskBoardPage } from "#/modules/tasks";

export const Route = createFileRoute(
	"/organizations/$organization/tasks/$boardKey/$taskPublicId",
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
			getTaskCardFn({
				data: {
					organizationName: params.organization,
					boardKey: params.boardKey,
					taskPublicId: params.taskPublicId,
				},
			}),
		]);
		return { organization, access, board, taskPublicId: params.taskPublicId };
	},
	component: () => {
		const { organization, access, board, taskPublicId } = Route.useLoaderData();
		return (
			<TaskBoardPage
				activeTaskPublicId={taskPublicId}
				board={board}
				canManage={access.canManageTasks}
				organizationName={organization.name}
			/>
		);
	},
});
