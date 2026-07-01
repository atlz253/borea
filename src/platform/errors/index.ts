export class NotFoundError extends Error {
	override readonly name = "NotFoundError";
}

export class ConflictError extends Error {
	override readonly name = "ConflictError";

	constructor(
		message: string,
		readonly details?: unknown,
	) {
		super(message);
	}
}

export class ValidationError extends Error {
	override readonly name = "ValidationError";

	constructor(
		message: string,
		readonly details?: unknown,
	) {
		super(message);
	}
}
