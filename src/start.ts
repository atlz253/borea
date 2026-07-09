import { randomUUID } from "node:crypto";
import { SpanStatusCode, trace } from "@opentelemetry/api";
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
const tracer = trace.getTracer("borea");

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

		setResponseHeader(REQUEST_ID_HEADER, requestId);
		return tracer.startActiveSpan(
			`${request.method} ${requestPath}`,
			async (span) => {
				const startedAt = performance.now();
				const requestLogger = logger.child({
					handlerType,
					method: request.method,
					path: requestPath,
					requestId,
				});

				span.setAttribute("http.request.method", request.method);
				span.setAttribute("url.path", requestPath);
				span.setAttribute("borea.request_id", requestId);
				span.setAttribute("borea.handler_type", handlerType);
				requestLogger.info("request.start");

				try {
					return await runWithRequestLogContext(
						{ logger: requestLogger, requestId },
						async () => {
							const result = await next();
							const durationMs = Math.round(performance.now() - startedAt);
							span.setAttribute(
								"http.response.status_code",
								result.response.status,
							);
							span.setStatus({ code: SpanStatusCode.OK });
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
					span.recordException(error as Error);
					span.setAttribute("http.response.status_code", SERVER_ERROR_STATUS);
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: error instanceof Error ? error.message : String(error),
					});
					requestLogger.error(
						{
							...toErrorLog(error),
							durationMs,
							status: SERVER_ERROR_STATUS,
						},
						"request.error",
					);
					throw error;
				} finally {
					span.end();
				}
			},
		);
	},
);

const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
	requestMiddleware: [requestLoggerMiddleware, csrfMiddleware],
}));
