import type { CreatedGitToken, GitToken } from "./schemas";

export interface GitTokenStore {
	create(userId: string, name: string): Promise<CreatedGitToken>;
	list(userId: string): Promise<GitToken[]>;
	revoke(userId: string, tokenId: string): Promise<void>;
	verify(token: string): Promise<string | undefined>;
}
