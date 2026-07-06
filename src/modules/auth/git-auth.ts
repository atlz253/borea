import { createServerOnlyFn } from "@tanstack/react-start";
import type { User } from "./schemas";

export function parseBasicToken(request: Request): string | undefined {
	const authorization = request.headers.get("authorization");
	if (!authorization) {
		return undefined;
	}
	const [scheme, encoded, extra] = authorization.split(" ");
	if (scheme?.toLowerCase() !== "basic" || !encoded || extra !== undefined) {
		return undefined;
	}
	try {
		const decoded = Buffer.from(encoded, "base64").toString("utf-8");
		const separator = decoded.indexOf(":");
		if (separator < 1) {
			return undefined;
		}
		const token = decoded.slice(separator + 1);
		return token.length > 0 ? token : undefined;
	} catch {
		return undefined;
	}
}

export const getGitRequestUser = createServerOnlyFn(
	async (request: Request): Promise<User | null> => {
		const { authMode, authProvider } = await import("./server/auth.server");
		if (authMode === "noauth") {
			return authProvider.requireCurrentUser();
		}
		const token = parseBasicToken(request);
		return token ? authProvider.authenticateGitToken(token) : null;
	},
);
