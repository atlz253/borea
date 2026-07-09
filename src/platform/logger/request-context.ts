import type { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";
import { logger } from "./index";

export interface RequestLogContext {
	logger: Logger;
	requestId: string;
}

let requestLogStorage: AsyncLocalStorage<RequestLogContext> | undefined;

async function getRequestLogStorage(): Promise<
	AsyncLocalStorage<RequestLogContext> | undefined
> {
	if (typeof window !== "undefined") {
		return undefined;
	}
	if (requestLogStorage) {
		return requestLogStorage;
	}
	const asyncHooks = await import("node:async_hooks");
	requestLogStorage = new asyncHooks.AsyncLocalStorage<RequestLogContext>();
	return requestLogStorage;
}

export async function runWithRequestLogContext<T>(
	context: RequestLogContext,
	callback: () => T | Promise<T>,
): Promise<T> {
	const storage = await getRequestLogStorage();
	if (!storage) {
		return callback();
	}
	return storage.run(context, callback);
}

export function getRequestLogger(): Logger {
	return requestLogStorage?.getStore()?.logger ?? logger;
}

export function getRequestId(): string | undefined {
	return requestLogStorage?.getStore()?.requestId;
}
