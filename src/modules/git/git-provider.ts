export interface RepositoryInfo {
	name: string;
	description?: string;
	createdAt: Date;
}

export interface GitProvider {
	init(name: string, description?: string): Promise<RepositoryInfo>;
	list(): Promise<RepositoryInfo[]>;
	exists(name: string): Promise<boolean>;
}
