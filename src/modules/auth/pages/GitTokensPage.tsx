import {
	Alert,
	Button,
	Card,
	Code,
	CopyButton,
	Group,
	Modal,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CreatedGitToken, GitToken } from "../schemas";
import {
	createGitTokenFn,
	revokeGitTokenFn,
} from "../server/auth.functions";

const ISO_DATE_END = 10;
const ISO_TIME_START = 11;
const ISO_TIME_END = 16;

function formatCreatedAt(createdAt: string): string {
	const date = createdAt.slice(0, ISO_DATE_END);
	const time = createdAt.slice(ISO_TIME_START, ISO_TIME_END);
	return `${date} ${time} UTC`;
}

export default function GitTokensPage({
	initialTokens,
}: {
	initialTokens: GitToken[];
}) {
	const [tokens, setTokens] = useState(initialTokens);
	const [name, setName] = useState("");
	const [createdToken, setCreatedToken] = useState<CreatedGitToken | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [revokingId, setRevokingId] = useState<string | null>(null);

	const createToken = async (event: React.FormEvent) => {
		event.preventDefault();
		setCreating(true);
		setError(null);
		try {
			const created = await createGitTokenFn({ data: { name } });
			setTokens((current) => [
				{
					id: created.id,
					name: created.name,
					createdAt: created.createdAt,
				},
				...current,
			]);
			setCreatedToken(created);
			setName("");
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Could not create token",
			);
		} finally {
			setCreating(false);
		}
	};

	const revokeToken = async (tokenId: string) => {
		setRevokingId(tokenId);
		setError(null);
		try {
			await revokeGitTokenFn({ data: { tokenId } });
			setTokens((current) => current.filter((token) => token.id !== tokenId));
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Could not revoke token",
			);
		} finally {
			setRevokingId(null);
		}
	};

	return (
		<Stack maw={800}>
			<div>
				<Title order={1}>Git personal access tokens</Title>
				<Text c="dimmed">
					Use a token as the password for Git clone, fetch, and push over
					HTTPS.
				</Text>
			</div>

			<Card withBorder>
				<form onSubmit={(event) => void createToken(event)}>
					<Stack>
						<TextInput
							label="Token name"
							description="Choose a name that identifies the device or client."
							placeholder="Work laptop"
							value={name}
							onChange={(event) => setName(event.currentTarget.value)}
							maxLength={100}
							required
						/>
						<Button
							type="submit"
							leftSection={<KeyRound size={16} />}
							loading={creating}
							style={{ alignSelf: "flex-start" }}
						>
							Create token
						</Button>
					</Stack>
				</form>
			</Card>

			{error && <Alert color="red">{error}</Alert>}

			<Stack gap="sm">
				<Title order={2} size="h3">
					Active tokens
				</Title>
				{tokens.length === 0 ? (
					<Text c="dimmed">No Git tokens have been created.</Text>
				) : (
					tokens.map((token) => (
						<Card withBorder key={token.id}>
							<Group justify="space-between" align="center">
								<div>
									<Text fw={600}>{token.name}</Text>
									<Text size="sm" c="dimmed">
										Created {formatCreatedAt(token.createdAt)}
									</Text>
								</div>
								<Button
									color="red"
									variant="light"
									leftSection={<Trash2 size={14} />}
									loading={revokingId === token.id}
									onClick={() => void revokeToken(token.id)}
								>
									Revoke
								</Button>
							</Group>
						</Card>
					))
				)}
			</Stack>

			<Modal
				opened={createdToken !== null}
				onClose={() => setCreatedToken(null)}
				title="Git token created"
				centered
			>
				<Stack>
					<Alert color="yellow">
						Copy this token now. It will not be shown again.
					</Alert>
					<Code block>{createdToken?.token}</Code>
					{createdToken && (
						<CopyButton value={createdToken.token}>
							{({ copied, copy }) => (
								<Button
									onClick={copy}
									leftSection={
										copied ? <Check size={16} /> : <Copy size={16} />
									}
								>
									{copied ? "Copied" : "Copy token"}
								</Button>
							)}
						</CopyButton>
					)}
				</Stack>
			</Modal>
		</Stack>
	);
}
