import "./openapi-zod";
import { ZodError, z } from "zod";
import {
	ConflictError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "#/platform/errors";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_UNAUTHORIZED = 401;

export const apiErrorSchema = z.object({
	code: z.string(),
	message: z.string(),
	details: z.unknown().optional(),
});

function errorResponse(
	status: number,
	code: string,
	message: string,
	details?: unknown,
): Response {
	return Response.json(
		{
			code,
			message,
			...(details === undefined ? {} : { details }),
		},
		{ status },
	);
}

export async function handleApiRequest(
	handler: () => Promise<Response>,
): Promise<Response> {
	try {
		return await handler();
	} catch (error) {
		if (error instanceof ZodError) {
			return errorResponse(
				HTTP_BAD_REQUEST,
				"validation_error",
				"Request validation failed",
				error.issues,
			);
		}
		if (error instanceof ValidationError) {
			return errorResponse(
				HTTP_BAD_REQUEST,
				"validation_error",
				error.message,
				error.details,
			);
		}
		if (error instanceof NotFoundError) {
			return errorResponse(HTTP_NOT_FOUND, "not_found", error.message);
		}
		if (error instanceof UnauthorizedError) {
			return errorResponse(HTTP_UNAUTHORIZED, "unauthorized", error.message);
		}
		if (error instanceof ConflictError) {
			return errorResponse(
				HTTP_CONFLICT,
				"conflict",
				error.message,
				error.details,
			);
		}
		return errorResponse(
			HTTP_INTERNAL_SERVER_ERROR,
			"internal_error",
			"An unexpected error occurred",
		);
	}
}

export async function parseJsonBody<T>(
	request: Request,
	schema: z.ZodType<T>,
): Promise<T> {
	const body = await request.text();
	if (body.length === 0) {
		return schema.parse({});
	}

	const contentType = request.headers.get("content-type");
	if (!contentType?.toLowerCase().includes("application/json")) {
		throw new ValidationError("Content-Type must be application/json");
	}

	try {
		return schema.parse(JSON.parse(body));
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new ValidationError("Request body must be valid JSON");
		}
		throw error;
	}
}
