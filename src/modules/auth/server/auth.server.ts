import { getConfig } from "#/platform/config";
import { FileSystemGitTokenStore } from "../git-token.store";
import { FileAuthProvider, NoAuthProvider } from "../providers";
import { cookieAuthSession } from "../session";
import { FileSystemUserStore } from "../user.store";

const config = getConfig();

export const authProvider =
	config.authMode === "noauth"
		? new NoAuthProvider(config.defaultUserName)
		: new FileAuthProvider(
				new FileSystemUserStore(config.usersPath),
				cookieAuthSession,
				new FileSystemGitTokenStore(config.usersPath),
			);

export const authMode = config.authMode;
