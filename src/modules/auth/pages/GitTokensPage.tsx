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
import * as m from "#/paraglide/messages";
import type { CreatedGitToken, GitToken } from "../schemas";
import { createGitTokenFn, revokeGitTokenFn } from "../server/auth.functions";

const ISO_DATE_END = 10;
const ISO_TIME_START = 11;
const ISO_TIME_END = 16;

function formatCreatedAt(createdAt: string): string {
	const date = createdAt.slice(0, ISO_DATE_END);
	const time = createdAt.slice(ISO_TIME_START, ISO_TIME_END);
	return `${m.auth_gitTokens_created_label()}${date} ${time} UTC`;
}

export default function GitTokensPage({
	initialTokens,
}: {
	initialTokens: GitToken[];
}) {
	const [tokens, setTokens] = useState(initialTokens);
	const [name, setName] = useState("");
	const [createdToken, setCreatedToken] = useState<CreatedGitToken | null>(
		null,
	);
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
				caught instanceof Error
					? caught.message
					: m.auth_gitTokens_error_create(),
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
				caught instanceof Error
					? caught.message
					: m.auth_gitTokens_error_revoke(),
			);
		} finally {
			setRevokingId(null);
		}
	};

	return (
		<Stack maw={800}>
			<div>
				<Title order={1}>{m.auth_gitTokens_title()}</Title>
				<Text c="dimmed">{m.auth_gitTokens_description()}</Text>
			</div>

			<Card withBorder>
				<form onSubmit={(event) => void createToken(event)}>
					<Stack>
						<TextInput
							label={m.auth_gitTokens_tokenName_label()}
							description={m.auth_gitTokens_tokenName_description()}
							placeholder={m.auth_gitTokens_tokenName_placeholder()}
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
							{m.auth_gitTokens_create_button()}
						</Button>
					</Stack>
				</form>
			</Card>

			{error && <Alert color="red">{error}</Alert>}

			<Stack gap="sm">
				<Title order={2} size="h3">
					{m.auth_gitTokens_activeTokens_heading()}
				</Title>
				{tokens.length === 0 ? (
					<Text c="dimmed">{m.auth_gitTokens_empty()}</Text>
				) : (
					tokens.map((token) => (
						<Card withBorder key={token.id}>
							<Group justify="space-between" align="center">
								<div>
									<Text fw={600}>{token.name}</Text>
									<Text size="sm" c="dimmed">
										{formatCreatedAt(token.createdAt)}
									</Text>
								</div>
								<Button
									color="red"
									variant="light"
									leftSection={<Trash2 size={14} />}
									loading={revokingId === token.id}
									onClick={() => void revokeToken(token.id)}
								>
									{m.auth_gitTokens_revoke_button()}
								</Button>
							</Group>
						</Card>
					))
				)}
			</Stack>

			<Modal
				opened={createdToken !== null}
				onClose={() => setCreatedToken(null)}
				title={m.auth_gitTokens_createdModal_title()}
				centered
			>
				<Stack>
					<Alert color="yellow">{m.auth_gitTokens_createdModal_alert()}</Alert>
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
									{copied
										? m.auth_gitTokens_copied_button()
										: m.auth_gitTokens_copy_button()}
								</Button>
							)}
						</CopyButton>
					)}
				</Stack>
			</Modal>
		</Stack>
	);
}
