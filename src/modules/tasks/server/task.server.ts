import { PrismaDatabaseProvider } from "#/platform/database";
import { PrismaTaskStore } from "../prisma-task.store";
import { createTaskService } from "../task.service";

const db = new PrismaDatabaseProvider();
const taskStore = new PrismaTaskStore(db);

export const taskService = createTaskService(taskStore);
