import { authUserDirectory } from "#/modules/auth";
import { getConfig } from "#/platform/config";
import { PrismaDatabaseProvider } from "#/platform/database";
import { createOrganizationService } from "../organization.service";
import { PrismaOrganizationStore } from "../prisma-organization.store";

const config = getConfig();
const db = new PrismaDatabaseProvider();
const organizationStore = new PrismaOrganizationStore(db);

export const organizationMode = config.organizationMode;
export const organizationService = createOrganizationService(
	organizationStore,
	organizationMode,
	config.authMode === "noauth",
	authUserDirectory,
);
export const publicOrganizationService = createOrganizationService(
	organizationStore,
	organizationMode,
	true,
);
