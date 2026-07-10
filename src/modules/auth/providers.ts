import { ForbiddenError, UnauthorizedError } from "#/platform/errors";
import type { AuthProvider } from "./auth-provider";
import type { GitTokenStore } from "./git-token.store";
import { verifyPassword } from "./password";
import type {
	CreatedGitToken,
	GitToken,
	LoginInput,
	RegisterInput,
	User,
} from "./schemas";
import type { AuthSession } from "./session";
import type { UserStore } from "./user.store";

export class FileAuthProvider implements AuthProvider {
	constructor(
		private readonly users: UserStore,
		private readonly session: AuthSession,
		private readonly gitTokens: GitTokenStore,
	) {}

	async getCurrentUser(): Promise<User | null> {
		const userId = await this.session.getUserId();
		if (!userId) {
			return null;
		}
		const stored = await this.users.getById(userId);
		if (!stored) {
			await this.session.clear();
			return null;
		}
		const { credential: _credential, ...user } = stored;
		return user;
	}

	async requireCurrentUser(): Promise<User> {
		const user = await this.getCurrentUser();
		if (!user) {
			throw new UnauthorizedError("Authentication required");
		}
		return user;
	}

	async getUserByEmail(email: string): Promise<User | undefined> {
		const stored = await this.users.getByEmail(email);
		if (!stored) {
			return undefined;
		}
		const { credential: _credential, ...user } = stored;
		return user;
	}

	async getUserById(id: string): Promise<User | undefined> {
		const stored = await this.users.getById(id);
		if (!stored) {
			return undefined;
		}
		const { credential: _credential, ...user } = stored;
		return user;
	}

	async getUserByUsername(username: string): Promise<User | undefined> {
		const stored = await this.users.getByUsername(username);
		if (!stored) {
			return undefined;
		}
		const { credential: _credential, ...user } = stored;
		return user;
	}

	async authenticateGitToken(token: string): Promise<User | null> {
		const userId = await this.gitTokens.verify(token);
		return userId ? ((await this.getUserById(userId)) ?? null) : null;
	}

	async createGitToken(userId: string, name: string): Promise<CreatedGitToken> {
		return this.gitTokens.create(userId, name);
	}

	async listGitTokens(userId: string): Promise<GitToken[]> {
		return this.gitTokens.list(userId);
	}

	async revokeGitToken(userId: string, tokenId: string): Promise<void> {
		await this.gitTokens.revoke(userId, tokenId);
	}

	async register(input: RegisterInput): Promise<User> {
		const user = await this.users.create(input);
		await this.session.setUserId(user.id);
		return user;
	}

	async login(input: LoginInput): Promise<User> {
		const stored = await this.users.getByEmail(input.email);
		if (!stored || !(await verifyPassword(input.password, stored.credential))) {
			throw new UnauthorizedError("Invalid email or password");
		}
		await this.session.setUserId(stored.id);
		const { credential: _credential, ...user } = stored;
		return user;
	}

	async logout(): Promise<void> {
		await this.session.clear();
	}
}

export class NoAuthProvider implements AuthProvider {
	private readonly user: User;

	constructor(name: string) {
		this.user = {
			id: "00000000-0000-4000-8000-000000000000",
			username: name,
			email: "noauth@localhost",
			createdAt: new Date(0).toISOString(),
		};
	}

	async getCurrentUser(): Promise<User> {
		return this.user;
	}

	async requireCurrentUser(): Promise<User> {
		return this.user;
	}

	async getUserByEmail(email: string): Promise<User | undefined> {
		return email === this.user.email ? this.user : undefined;
	}

	async getUserById(id: string): Promise<User | undefined> {
		return id === this.user.id ? this.user : undefined;
	}

	async getUserByUsername(username: string): Promise<User | undefined> {
		return username === this.user.username ? this.user : undefined;
	}

	async authenticateGitToken(_token: string): Promise<User> {
		return this.user;
	}

	async createGitToken(
		_userId: string,
		_name: string,
	): Promise<CreatedGitToken> {
		throw new ForbiddenError("Git tokens are unavailable in NoAuth mode");
	}

	async listGitTokens(_userId: string): Promise<GitToken[]> {
		throw new ForbiddenError("Git tokens are unavailable in NoAuth mode");
	}

	async revokeGitToken(_userId: string, _tokenId: string): Promise<void> {
		throw new ForbiddenError("Git tokens are unavailable in NoAuth mode");
	}

	async register(_input: RegisterInput): Promise<User> {
		return this.user;
	}

	async login(_input: LoginInput): Promise<User> {
		return this.user;
	}

	async logout(): Promise<void> {}
}
