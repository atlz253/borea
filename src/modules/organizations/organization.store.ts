import type {
	Organization,
	OrganizationRole,
	RepositoryRole,
	StoredOrganizationMember,
	StoredRepositoryAccess,
	StoredRepositoryMember,
	UpdateOrganizationInput,
} from "./schemas";

export interface CreateOrganizationStoreInput {
	name: string;
	description?: string;
	initialMemberId?: string;
}

export interface OrganizationStore {
	create(input: CreateOrganizationStoreInput): Promise<Organization>;
	update(name: string, input: UpdateOrganizationInput): Promise<Organization>;
	delete(name: string): Promise<void>;
	list(): Promise<Organization[]>;
	get(name: string): Promise<Organization | undefined>;
	addMember(name: string, userId: string): Promise<StoredOrganizationMember>;
	getMember(
		name: string,
		userId: string,
	): Promise<StoredOrganizationMember | undefined>;
	updateMemberRole(
		name: string,
		userId: string,
		role: OrganizationRole,
	): Promise<StoredOrganizationMember>;
	transferOwnership(
		name: string,
		currentOwnerId: string,
		nextOwnerId: string,
	): Promise<void>;
	removeMember(name: string, userId: string): Promise<void>;
	listMembers(name: string): Promise<StoredOrganizationMember[]>;
	createRepositoryAccess(
		name: string,
		repositoryName: string,
		ownerId: string,
	): Promise<StoredRepositoryAccess>;
	getRepositoryAccess(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryAccess | undefined>;
	deleteRepositoryAccess(name: string, repositoryName: string): Promise<void>;
	listRepositoryAccess(
		name: string,
	): Promise<Array<StoredRepositoryAccess & { repositoryName: string }>>;
	setRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
		role: RepositoryRole,
	): Promise<StoredRepositoryMember>;
	getRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<StoredRepositoryMember | undefined>;
	removeRepositoryMember(
		name: string,
		repositoryName: string,
		userId: string,
	): Promise<void>;
	listRepositoryMembers(
		name: string,
		repositoryName: string,
	): Promise<StoredRepositoryMember[]>;
}
