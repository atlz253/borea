import type { RepositoryLocator } from "#/modules/git";
import type { PullRequest, PullRequestComment } from "./schemas";

export interface PullRequestStore {
	create(input: {
		organizationName: string;
		repoName: string;
		title: string;
		sourceBranch: string;
		targetBranch: string;
		authorName: string;
	}): Promise<PullRequest>;
	list(locator: RepositoryLocator): Promise<PullRequest[]>;
	get(locator: RepositoryLocator, id: number): Promise<PullRequest | undefined>;
	update(
		locator: RepositoryLocator,
		id: number,
		data: Partial<PullRequest>,
	): Promise<PullRequest>;
	setFileViewed(
		locator: RepositoryLocator,
		id: number,
		filePath: string,
		viewed: boolean,
	): Promise<PullRequest>;
	listComments(
		locator: RepositoryLocator,
		id: number,
	): Promise<PullRequestComment[]>;
	addComment(
		locator: RepositoryLocator,
		id: number,
		input: {
			target: PullRequestComment["target"];
			body: string;
			authorId: string;
			authorName: string;
		},
	): Promise<PullRequestComment>;
	deleteAll(locator: RepositoryLocator): Promise<void>;
}
