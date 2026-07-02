import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { PasswordCredential } from "./schemas";

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY_BYTES = 33_554_432;
const SALT_LENGTH = 16;

function deriveKey(
	password: string,
	salt: Buffer,
	credential: Pick<
		PasswordCredential,
		"cost" | "blockSize" | "parallelization" | "keyLength"
	>,
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(
			password,
			salt,
			credential.keyLength,
			{
				N: credential.cost,
				r: credential.blockSize,
				p: credential.parallelization,
				maxmem: MAX_MEMORY_BYTES,
			},
			(error, key) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(key);
			},
		);
	});
}

export async function hashPassword(
	password: string,
): Promise<PasswordCredential> {
	const salt = randomBytes(SALT_LENGTH);
	const parameters = {
		cost: COST,
		blockSize: BLOCK_SIZE,
		parallelization: PARALLELIZATION,
		keyLength: KEY_LENGTH,
	};
	const hash = await deriveKey(password, salt, parameters);
	return {
		algorithm: "scrypt",
		version: 1,
		salt: salt.toString("base64"),
		hash: hash.toString("base64"),
		...parameters,
	};
}

export async function verifyPassword(
	password: string,
	credential: PasswordCredential,
): Promise<boolean> {
	const expected = Buffer.from(credential.hash, "base64");
	const actual = await deriveKey(
		password,
		Buffer.from(credential.salt, "base64"),
		credential,
	);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}
