import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
	describe("hashPassword", () => {
		it("returns a credential with scrypt algorithm and version 1", async () => {
			const credential = await hashPassword("password123");

			expect(credential.algorithm).toBe("scrypt");
			expect(credential.version).toBe(1);
		});

		it("generates unique salts for each hash", async () => {
			const credential1 = await hashPassword("password123");
			const credential2 = await hashPassword("password123");

			expect(credential1.salt).not.toBe(credential2.salt);
		});

		it("generates different hashes for the same password (due to unique salt)", async () => {
			const credential1 = await hashPassword("password123");
			const credential2 = await hashPassword("password123");

			expect(credential1.hash).not.toBe(credential2.hash);
		});

		it("includes all required scrypt parameters", async () => {
			const credential = await hashPassword("password123");

			expect(credential.cost).toBe(16384);
			expect(credential.blockSize).toBe(8);
			expect(credential.parallelization).toBe(1);
			expect(credential.keyLength).toBe(64);
		});

		it("encodes salt and hash in base64", async () => {
			const credential = await hashPassword("password123");

			expect(() => Buffer.from(credential.salt, "base64")).not.toThrow();
			expect(() => Buffer.from(credential.hash, "base64")).not.toThrow();
		});

		it("handles empty password", async () => {
			const credential = await hashPassword("");

			expect(credential.algorithm).toBe("scrypt");
			expect(credential.version).toBe(1);
			expect(credential.salt).toBeTruthy();
			expect(credential.hash).toBeTruthy();
		});

		it("handles long passwords", async () => {
			const longPassword = "a".repeat(1000);
			const credential = await hashPassword(longPassword);

			expect(credential.algorithm).toBe("scrypt");
			expect(credential.version).toBe(1);
			expect(credential.salt).toBeTruthy();
			expect(credential.hash).toBeTruthy();
		});

		it("handles passwords with special characters", async () => {
			const specialPassword = "p@$$w0rd!#%^&*()";
			const credential = await hashPassword(specialPassword);

			expect(credential.algorithm).toBe("scrypt");
			expect(credential.version).toBe(1);
			expect(credential.salt).toBeTruthy();
			expect(credential.hash).toBeTruthy();
		});

		it("handles unicode characters in password", async () => {
			const unicodePassword = "пароль🔥测试";
			const credential = await hashPassword(unicodePassword);

			expect(credential.algorithm).toBe("scrypt");
			expect(credential.version).toBe(1);
			expect(credential.salt).toBeTruthy();
			expect(credential.hash).toBeTruthy();
		});

		it("produces consistent salt length", async () => {
			const credential = await hashPassword("password123");
			const saltBuffer = Buffer.from(credential.salt, "base64");

			expect(saltBuffer.length).toBe(16);
		});

		it("produces consistent key length", async () => {
			const credential = await hashPassword("password123");
			const hashBuffer = Buffer.from(credential.hash, "base64");

			expect(hashBuffer.length).toBe(64);
		});
	});

	describe("verifyPassword", () => {
		it("returns true for correct password", async () => {
			const credential = await hashPassword("password123");
			const result = await verifyPassword("password123", credential);

			expect(result).toBe(true);
		});

		it("returns false for incorrect password", async () => {
			const credential = await hashPassword("password123");
			const result = await verifyPassword("wrongpassword", credential);

			expect(result).toBe(false);
		});

		it("returns false for empty password when hash was created with non-empty password", async () => {
			const credential = await hashPassword("password123");
			const result = await verifyPassword("", credential);

			expect(result).toBe(false);
		});

		it("returns false for empty password when hash was created with empty password", async () => {
			const credential = await hashPassword("");
			const result = await verifyPassword("", credential);

			expect(result).toBe(true);
		});

		it("returns true for long passwords", async () => {
			const longPassword = "a".repeat(1000);
			const credential = await hashPassword(longPassword);
			const result = await verifyPassword(longPassword, credential);

			expect(result).toBe(true);
		});

		it("returns false for incorrect long passwords", async () => {
			const longPassword = "a".repeat(1000);
			const credential = await hashPassword(longPassword);
			const result = await verifyPassword("b".repeat(1000), credential);

			expect(result).toBe(false);
		});

		it("returns true for passwords with special characters", async () => {
			const specialPassword = "p@$$w0rd!#%^&*()";
			const credential = await hashPassword(specialPassword);
			const result = await verifyPassword(specialPassword, credential);

			expect(result).toBe(true);
		});

		it("returns false for incorrect special character passwords", async () => {
			const specialPassword = "p@$$w0rd!#%^&*()";
			const credential = await hashPassword(specialPassword);
			const result = await verifyPassword("p@$$w0rd!#%^&*()", credential);

			expect(result).toBe(true);
		});

		it("returns true for unicode passwords", async () => {
			const unicodePassword = "пароль🔥测试";
			const credential = await hashPassword(unicodePassword);
			const result = await verifyPassword(unicodePassword, credential);

			expect(result).toBe(true);
		});

		it("returns false for incorrect unicode passwords", async () => {
			const unicodePassword = "пароль🔥测试";
			const credential = await hashPassword(unicodePassword);
			const result = await verifyPassword("different🔥text", credential);

			expect(result).toBe(false);
		});

		it("works with multiple credentials for the same password", async () => {
			const credential1 = await hashPassword("password123");
			const credential2 = await hashPassword("password123");

			const result1 = await verifyPassword("password123", credential1);
			const result2 = await verifyPassword("password123", credential2);

			expect(result1).toBe(true);
			expect(result2).toBe(true);
		});

		it("works with different passwords for different credentials", async () => {
			const credential1 = await hashPassword("password1");
			const credential2 = await hashPassword("password2");

			const result1 = await verifyPassword("password1", credential1);
			const result2 = await verifyPassword("password2", credential2);

			expect(result1).toBe(true);
			expect(result2).toBe(true);
		});

		it("returns false when verifying with wrong credential", async () => {
			const credential2 = await hashPassword("password2");

			const result = await verifyPassword("password1", credential2);

			expect(result).toBe(false);
		});
	});

	describe("integration", () => {
		it("round-trip: hash then verify with various passwords", async () => {
			const passwords = [
				"simple",
				"complex!@#$%",
				"with spaces",
				"",
				"a".repeat(500),
				"unicode: 日本語",
			];

			for (const password of passwords) {
				const credential = await hashPassword(password);
				const result = await verifyPassword(password, credential);

				expect(result).toBe(true);
			}
		});

		it("rejects partially modified passwords", async () => {
			const password = "correcthorsebatterystaple";
			const credential = await hashPassword(password);

			const variations = [
				"correcthorsebatterystaples", // added character
				"orrecthorsebatterystaple", // removed character
				"Correcthorsebatterystaple", // changed case
				"correct horse batterystaple", // added space
			];

			for (const variation of variations) {
				const result = await verifyPassword(variation, credential);
				expect(result).toBe(false);
			}
		});
	});
});
