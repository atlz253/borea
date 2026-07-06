import { describe, expect, it, vi } from "vitest";
import { getGitRequestUser, parseBasicToken } from "./git-auth";

const mockModule = {
	authMode: "noauth" as string,
	authProvider: {
		requireCurrentUser: vi.fn(),
		authenticateGitToken: vi.fn(),
	},
};

vi.mock("./server/auth.server", () => mockModule);

function makeRequest(init?: { headers?: Record<string, string> }): Request {
	return new Request("http://localhost:3000/", {
		headers: init?.headers,
	});
}

const sampleUser = {
	id: "11111111-1111-4111-8111-111111111111",
	name: "Alice",
	email: "alice@example.com",
	createdAt: "2025-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// parseBasicToken
// ---------------------------------------------------------------------------

describe("parseBasicToken", () => {
	it("returns undefined when there is no Authorization header", () => {
		expect(parseBasicToken(makeRequest())).toBeUndefined();
	});

	it("returns undefined for non-Basic scheme", () => {
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: "Bearer abc123" } }),
			),
		).toBeUndefined();
	});

	it("returns undefined for Digest scheme", () => {
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: 'Digest username="alice"' } }),
			),
		).toBeUndefined();
	});

	it("returns undefined when scheme is present but encoded part is missing", () => {
		expect(
			parseBasicToken(makeRequest({ headers: { authorization: "Basic" } })),
		).toBeUndefined();
	});

	it("returns undefined for trailing-space Basic with empty encoding", () => {
		expect(
			parseBasicToken(makeRequest({ headers: { authorization: "Basic " } })),
		).toBeUndefined();
	});

	it("returns undefined when there are extra space-separated parts", () => {
		const encoded = Buffer.from("user:token").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({
					headers: { authorization: `Basic ${encoded} extra` },
				}),
			),
		).toBeUndefined();
	});

	it("returns undefined when the decoded string has no colon", () => {
		const encoded = Buffer.from("nocolonseparator").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBeUndefined();
	});

	it("returns undefined when colon is at position 0 (empty username)", () => {
		const encoded = Buffer.from(":password").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBeUndefined();
	});

	it("returns undefined when token after colon is empty", () => {
		const encoded = Buffer.from("user:").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBeUndefined();
	});

	it("extracts the token from a valid Basic auth header", () => {
		const encoded = Buffer.from("git-user:borea_abc123_xyz").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBe("borea_abc123_xyz");
	});

	it("treats the Basic scheme as case-insensitive", () => {
		const encoded = Buffer.from("user:token123").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `basic ${encoded}` } }),
			),
		).toBe("token123");
	});

	it("preserves colons inside the password portion", () => {
		const encoded = Buffer.from("user:pass:word:123").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBe("pass:word:123");
	});

	it("preserves URL-safe characters in the password", () => {
		const encoded = Buffer.from("user:to+ken/pa=ss").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBe("to+ken/pa=ss");
	});

	it("handles a single-character username", () => {
		const encoded = Buffer.from("x:mytoken").toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBe("mytoken");
	});

	it("handles a long username with no password characters", () => {
		const username = "a".repeat(200);
		const encoded = Buffer.from(`${username}:secret`).toString("base64");
		expect(
			parseBasicToken(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).toBe("secret");
	});
});

// ---------------------------------------------------------------------------
// getGitRequestUser
// ---------------------------------------------------------------------------

describe("getGitRequestUser", () => {
	it("returns the current user in noauth mode regardless of the request", async () => {
		mockModule.authMode = "noauth";
		mockModule.authProvider.requireCurrentUser.mockResolvedValue(sampleUser);

		const result = await getGitRequestUser(makeRequest());

		expect(result).toEqual(sampleUser);
		expect(mockModule.authProvider.requireCurrentUser).toHaveBeenCalledOnce();
		expect(mockModule.authProvider.authenticateGitToken).not.toHaveBeenCalled();
	});

	it("returns null when there is no Authorization header in file-auth mode", async () => {
		mockModule.authMode = "file";

		const result = await getGitRequestUser(makeRequest());

		expect(result).toBeNull();
		expect(mockModule.authProvider.authenticateGitToken).not.toHaveBeenCalled();
	});

	it("returns null when the Authorization header is not Basic", async () => {
		mockModule.authMode = "file";

		const result = await getGitRequestUser(
			makeRequest({ headers: { authorization: "Bearer some-token" } }),
		);

		expect(result).toBeNull();
		expect(mockModule.authProvider.authenticateGitToken).not.toHaveBeenCalled();
	});

	it("returns null when the Basic header is malformed (extra parts)", async () => {
		mockModule.authMode = "file";

		const result = await getGitRequestUser(
			makeRequest({
				headers: { authorization: "Basic aGVsbG8gd29ybGQ= extra" },
			}),
		);

		expect(result).toBeNull();
		expect(mockModule.authProvider.authenticateGitToken).not.toHaveBeenCalled();
	});

	it("returns null when the Basic header decodes to an empty token", async () => {
		mockModule.authMode = "file";

		const result = await getGitRequestUser(
			makeRequest({
				headers: {
					authorization: `Basic ${Buffer.from("user:").toString("base64")}`,
				},
			}),
		);

		expect(result).toBeNull();
		expect(mockModule.authProvider.authenticateGitToken).not.toHaveBeenCalled();
	});

	it("returns null when the Basic header decodes to no colon", async () => {
		mockModule.authMode = "file";

		const result = await getGitRequestUser(
			makeRequest({
				headers: {
					authorization: `Basic ${Buffer.from("nocolon").toString("base64")}`,
				},
			}),
		);

		expect(result).toBeNull();
		expect(mockModule.authProvider.authenticateGitToken).not.toHaveBeenCalled();
	});

	it("authenticates the user when a valid git token is provided", async () => {
		mockModule.authMode = "file";
		const token = "borea_00000000-0000-4000-8000-000000000000_abc123def456";
		mockModule.authProvider.authenticateGitToken.mockResolvedValue(sampleUser);

		const encoded = Buffer.from(`git-user:${token}`).toString("base64");
		const result = await getGitRequestUser(
			makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
		);

		expect(result).toEqual(sampleUser);
		expect(mockModule.authProvider.authenticateGitToken).toHaveBeenCalledWith(
			token,
		);
	});

	it("returns null when the git token is not recognized", async () => {
		mockModule.authMode = "file";
		mockModule.authProvider.authenticateGitToken.mockResolvedValue(null);

		const encoded = Buffer.from("user:unknown-token").toString("base64");
		const result = await getGitRequestUser(
			makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
		);

		expect(result).toBeNull();
		expect(mockModule.authProvider.authenticateGitToken).toHaveBeenCalledWith(
			"unknown-token",
		);
	});

	it("returns null when the git token provider throws", async () => {
		mockModule.authMode = "file";
		mockModule.authProvider.authenticateGitToken.mockRejectedValue(
			new Error("database connection lost"),
		);

		const encoded = Buffer.from("user:bad-token").toString("base64");
		await expect(
			getGitRequestUser(
				makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
			),
		).rejects.toThrow("database connection lost");
	});

	it("switches to requireCurrentUser when auth mode changes to noauth", async () => {
		mockModule.authMode = "noauth";
		mockModule.authProvider.requireCurrentUser.mockResolvedValue(sampleUser);

		const encoded = Buffer.from("user:token").toString("base64");
		const result = await getGitRequestUser(
			makeRequest({ headers: { authorization: `Basic ${encoded}` } }),
		);

		expect(result).toEqual(sampleUser);
		expect(mockModule.authProvider.requireCurrentUser).toHaveBeenCalledOnce();
		expect(mockModule.authProvider.authenticateGitToken).not.toHaveBeenCalled();
	});
});
