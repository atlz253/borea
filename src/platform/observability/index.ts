import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { logger } from "#/platform/logger";

const ENABLED_VALUES = new Set(["1", "true", "yes"]);
const DEFAULT_SERVICE_NAME = "borea";

let sdk: NodeSDK | undefined;
let shutdownRegistered = false;

function isObservabilityEnabled(): boolean {
	return ENABLED_VALUES.has((process.env.OTEL_ENABLED ?? "").toLowerCase());
}

function registerShutdown(): void {
	if (shutdownRegistered || !sdk) {
		return;
	}
	shutdownRegistered = true;

	const shutdown = (signal: NodeJS.Signals) => {
		void sdk
			?.shutdown()
			.then(() => {
				logger.info({ signal }, "observability.shutdown");
			})
			.catch((error: unknown) => {
				logger.warn({ err: error, signal }, "observability.shutdown_failed");
			});
	};

	process.once("SIGTERM", shutdown);
	process.once("SIGINT", shutdown);
}

export function initializeObservability(): void {
	if (sdk || !isObservabilityEnabled()) {
		return;
	}

	const serviceName = process.env.OTEL_SERVICE_NAME ?? DEFAULT_SERVICE_NAME;
	sdk = new NodeSDK({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: serviceName,
		}),
		traceExporter: new OTLPTraceExporter(),
	});

	sdk.start();
	registerShutdown();
	logger.info({ serviceName }, "observability.started");
}

initializeObservability();
