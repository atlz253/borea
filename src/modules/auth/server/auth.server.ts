import { getConfig } from "#/platform/config";
import { PrismaDatabaseProvider } from "#/platform/database";
import { PrismaGitTokenStore } from "../prisma-git-token.store";
import { PrismaUserStore } from "../prisma-user.store";
import { FileAuthProvider, NoAuthProvider } from "../providers";
import { cookieAuthSession } from "../session";

const config = getConfig();
const db = new PrismaDatabaseProvider();

export const authProvider =
	config.authMode === "noauth"
		? new NoAuthProvider(config.defaultUserName)
		: new FileAuthProvider(
				new PrismaUserStore(db),
				cookieAuthSession,
				new PrismaGitTokenStore(db),
			);

export const authMode = config.authMode;
