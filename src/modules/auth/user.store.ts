import type { RegisterInput, StoredUser, User } from "./schemas";

export interface UserStore {
	create(input: RegisterInput): Promise<User>;
	getByEmail(email: string): Promise<StoredUser | undefined>;
	getById(id: string): Promise<StoredUser | undefined>;
}
