import {
	getRequest,
	useSession as getServerSession,
} from "@tanstack/react-start/server";
import { getConfig } from "#/platform/config";
import { UnauthorizedError } from "#/platform/errors";

const SESSION_MAX_AGE_SECONDS = 604_800;

interface AuthSessionData {
	userId?: string;
}

export interface AuthSession {
	getUserId(): Promise<string | undefined>;
	setUserId(userId: string): Promise<void>;
	clear(): Promise<void>;
}

function sessionConfig() {
	const config = getConfig();
	if (!config.sessionSecret) {
		throw new Error("Session secret is unavailable");
	}
	return {
		name: "nirvana-session",
		password: config.sessionSecret,
		maxAge: SESSION_MAX_AGE_SECONDS,
		cookie: {
			httpOnly: true,
			sameSite: "lax" as const,
			secure: process.env.NODE_ENV === "production",
			path: "/",
			maxAge: SESSION_MAX_AGE_SECONDS,
		},
	};
}

export const cookieAuthSession: AuthSession = {
	async getUserId() {
		const session = await getServerSession<AuthSessionData>(sessionConfig());
		return session.data.userId;
	},
	async setUserId(userId) {
		const session = await getServerSession<AuthSessionData>(sessionConfig());
		await session.update({ userId });
	},
	async clear() {
		const session = await getServerSession<AuthSessionData>(sessionConfig());
		await session.clear();
	},
};

export function assertSameOriginRequest(): void {
	const request = getRequest();
	const origin = request.headers.get("origin");
	if (!origin) {
		return;
	}
	if (origin !== new URL(request.url).origin) {
		throw new UnauthorizedError("Cross-origin request rejected");
	}
}
