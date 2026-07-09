import pino, { type DestinationStream, type LoggerOptions } from "pino";

const DEFAULT_SERVICE_NAME = "borea";
const TEST_ENVIRONMENT = "test";
const DEVELOPMENT_ENVIRONMENT = "development";
const JSON_LOG_FORMAT = "json";
const PRETTY_LOG_FORMAT = "pretty";
const DEVELOPMENT_LOG_LEVEL = "debug";
const DEFAULT_LOG_LEVEL = "info";
const REDACTION_VALUE = "[Redacted]";

const REDACT_PATHS = [
	"authorization",
	"cookie",
	"password",
	"token",
	"sessionSecret",
	"headers.authorization",
	"headers.cookie",
	"headers.set-cookie",
	"*.authorization",
	"*.cookie",
	"*.password",
	"*.token",
	"*.sessionSecret",
];

type LogFormat = typeof JSON_LOG_FORMAT | typeof PRETTY_LOG_FORMAT;

interface CreateAppLoggerOptions {
	destination?: DestinationStream;
	environment?: string;
	logFormat?: LogFormat;
	logLevel?: string;
	serviceName?: string;
}

function readLogLevel(environment: string): string {
	if (process.env.LOG_LEVEL) {
		return process.env.LOG_LEVEL;
	}
	if (environment === DEVELOPMENT_ENVIRONMENT) {
		return DEVELOPMENT_LOG_LEVEL;
	}
	return DEFAULT_LOG_LEVEL;
}

function readLogFormat(environment: string): LogFormat {
	if (
		process.env.LOG_FORMAT === JSON_LOG_FORMAT ||
		process.env.LOG_FORMAT === PRETTY_LOG_FORMAT
	) {
		return process.env.LOG_FORMAT;
	}
	if (environment === DEVELOPMENT_ENVIRONMENT) {
		return PRETTY_LOG_FORMAT;
	}
	return JSON_LOG_FORMAT;
}

function createLoggerOptions(options: CreateAppLoggerOptions): LoggerOptions {
	const environment =
		options.environment ?? process.env.NODE_ENV ?? TEST_ENVIRONMENT;
	return {
		name:
			options.serviceName ??
			process.env.OTEL_SERVICE_NAME ??
			DEFAULT_SERVICE_NAME,
		level: options.logLevel ?? readLogLevel(environment),
		base: {
			environment,
			service:
				options.serviceName ??
				process.env.OTEL_SERVICE_NAME ??
				DEFAULT_SERVICE_NAME,
		},
		timestamp: pino.stdTimeFunctions.isoTime,
		redact: {
			paths: REDACT_PATHS,
			censor: REDACTION_VALUE,
		},
		serializers: {
			err: pino.stdSerializers.err,
			error: pino.stdSerializers.err,
		},
	};
}

function canUsePrettyTransport(): boolean {
	return typeof pino.transport === "function";
}

export function createAppLogger(options: CreateAppLoggerOptions = {}) {
	const environment =
		options.environment ?? process.env.NODE_ENV ?? TEST_ENVIRONMENT;
	const logFormat = options.logFormat ?? readLogFormat(environment);
	const loggerOptions = createLoggerOptions(options);

	if (options.destination) {
		return pino(loggerOptions, options.destination);
	}

	if (logFormat === PRETTY_LOG_FORMAT && canUsePrettyTransport()) {
		return pino(
			loggerOptions,
			pino.transport({
				target: "pino-pretty",
				options: {
					colorize: true,
					ignore: "pid,hostname",
					translateTime: "SYS:standard",
				},
			}),
		);
	}

	return pino(loggerOptions);
}

export const logger = createAppLogger();
