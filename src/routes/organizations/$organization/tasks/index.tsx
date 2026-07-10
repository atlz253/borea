import { createFileRoute } from "@tanstack/react-router";
import {
	getOrganizationAccessFn,
	getOrganizationFn,
} from "#/modules/organizations";
import { listTaskBoardsFn, TaskBoardsPage } from "#/modules/tasks";

export const Route = createFileRoute("/organizations/$organization/tasks/")({
	loader: async ({ params }) => {
		const [organization, access, boards] = await Promise.all([
			getOrganizationFn({ data: { organizationName: params.organization } }),
			getOrganizationAccessFn({
				data: { organizationName: params.organization },
			}),
			listTaskBoardsFn({ data: { organizationName: params.organization } }),
		]);
		return { organization, access, boards };
	},
	component: () => {
		const { organization, access, boards } = Route.useLoaderData();
		return (
			<TaskBoardsPage
				boards={boards}
				canManage={access.canManageTasks}
				organizationName={organization.name}
			/>
		);
	},
});
