export const logger = {
	warn(message: string): void {
		process.stderr.write(`[warn] ${message}\n`);
	},
};
