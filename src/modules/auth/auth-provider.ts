import type {
	CreatedGitToken,
	GitToken,
	LoginInput,
	RegisterInput,
	User,
} from "./schemas";

export interface AuthProvider {
	getCurrentUser(): Promise<User | null>;
	requireCurrentUser(): Promise<User>;
	getUserByEmail(email: string): Promise<User | undefined>;
	getUserById(id: string): Promise<User | undefined>;
	getUserByUsername(username: string): Promise<User | undefined>;
	authenticateGitToken(token: string): Promise<User | null>;
	createGitToken(userId: string, name: string): Promise<CreatedGitToken>;
	listGitTokens(userId: string): Promise<GitToken[]>;
	revokeGitToken(userId: string, tokenId: string): Promise<void>;
	register(input: RegisterInput): Promise<User>;
	login(input: LoginInput): Promise<User>;
	logout(): Promise<void>;
}
