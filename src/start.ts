import { randomUUID } from "node:crypto";
import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { logger } from "#/platform/logger";
import { runWithRequestLogContext } from "#/platform/logger/request-context";

const REQUEST_ID_HEADER = "x-request-id";
const SERVER_ERROR_STATUS = 500;

function resolveRequestId(request: Request): string {
	return request.headers.get(REQUEST_ID_HEADER) ?? randomUUID();
}

function toRequestPath(request: Request): string {
	const url = new URL(request.url);
	return `${url.pathname}${url.search}`;
}

function toErrorLog(error: unknown) {
	if (error instanceof Error) {
		return { err: error };
	}
	return { error };
}

const requestLoggerMiddleware = createMiddleware({ type: "request" }).server(
	async ({ handlerType, next, request }) => {
		const requestId = resolveRequestId(request);
		const requestPath = toRequestPath(request);
		const startedAt = performance.now();
		const requestLogger = logger.child({
			handlerType,
			method: request.method,
			path: requestPath,
			requestId,
		});

		setResponseHeader(REQUEST_ID_HEADER, requestId);
		requestLogger.info("request.start");

		try {
			return await runWithRequestLogContext(
				{ logger: requestLogger, requestId },
				async () => {
					const result = await next();
					const durationMs = Math.round(performance.now() - startedAt);
					requestLogger.info(
						{
							durationMs,
							status: result.response.status,
						},
						"request.finish",
					);
					return result;
				},
			);
		} catch (error) {
			const durationMs = Math.round(performance.now() - startedAt);
			requestLogger.error(
				{
					...toErrorLog(error),
					durationMs,
					status: SERVER_ERROR_STATUS,
				},
				"request.error",
			);
			throw error;
		}
	},
);

const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
	requestMiddleware: [requestLoggerMiddleware, csrfMiddleware],
}));
