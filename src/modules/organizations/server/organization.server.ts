import { getConfig } from "#/platform/config";
import { createOrganizationService } from "../organization.service";
import { FileSystemOrganizationStore } from "../organization.store";

const config = getConfig();
const organizationStore = new FileSystemOrganizationStore(
	config.organizationsPath,
);

export const organizationMode = config.organizationMode;
export const organizationService = createOrganizationService(
	organizationStore,
	organizationMode,
);
