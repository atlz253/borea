import type { LoginInput, RegisterInput, User } from "./schemas";

export interface AuthProvider {
	getCurrentUser(): Promise<User | null>;
	requireCurrentUser(): Promise<User>;
	register(input: RegisterInput): Promise<User>;
	login(input: LoginInput): Promise<User>;
	logout(): Promise<void>;
}
