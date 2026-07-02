import { createContext, type ReactNode, useContext } from "react";
import type { RepositoryAccessSummary } from "./access-control.types";

const defaultAccess: RepositoryAccessSummary = {
	isOwner: false,
	canRead: true,
	canWrite: true,
	canManageAccess: false,
	canAssignRepositoryModerator: false,
	canDelete: true,
};

const RepositoryAccessContext =
	createContext<RepositoryAccessSummary>(defaultAccess);

export function RepositoryAccessProvider({
	access,
	children,
}: {
	access: RepositoryAccessSummary;
	children: ReactNode;
}) {
	return (
		<RepositoryAccessContext.Provider value={access}>
			{children}
		</RepositoryAccessContext.Provider>
	);
}

export function useRepositoryAccess(): RepositoryAccessSummary {
	return useContext(RepositoryAccessContext);
}
