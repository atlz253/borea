import {
	Box,
	Button,
	Container,
	Group,
	Modal,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteRepositoryFn } from "../server/repository.functions";

interface RepositorySettingsPageProps {
	name: string;
	onDeleted?: () => void;
}

export default function RepositorySettingsPage({
	name,
	onDeleted = () => window.location.assign("/repositories"),
}: RepositorySettingsPageProps) {
	const [opened, setOpened] = useState(false);
	const [confirmation, setConfirmation] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const closeModal = () => {
		if (loading) {
			return;
		}
		setOpened(false);
		setConfirmation("");
		setError(null);
	};

	const handleDelete = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setLoading(true);

		try {
			await deleteRepositoryFn({ data: { name, confirmation } });
			onDeleted();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete repository",
			);
			setLoading(false);
		}
	};

	return (
		<Container size="lg" py="xl">
			<Title order={1} mb="lg">
				Repository settings
			</Title>

			<Box
				p="lg"
				style={{
					border: "1px solid var(--mantine-color-red-6)",
					borderRadius: "var(--mantine-radius-md)",
				}}
			>
				<Group justify="space-between" align="center">
					<div>
						<Text fw={700}>Delete repository</Text>
						<Text size="sm" c="dimmed">
							Permanently delete this repository and all of its pull requests.
						</Text>
					</div>
					<Button
						color="red"
						leftSection={<Trash2 size={16} />}
						onClick={() => setOpened(true)}
					>
						Delete repository
					</Button>
				</Group>
			</Box>

			<Modal
				opened={opened}
				onClose={closeModal}
				title="Delete repository"
				centered
				closeOnClickOutside={!loading}
				closeOnEscape={!loading}
			>
				<form onSubmit={handleDelete}>
					<Stack>
						<Text size="sm">
							This action cannot be undone. Enter <strong>{name}</strong> to
							confirm.
						</Text>
						<TextInput
							data-autofocus
							label="Repository name"
							value={confirmation}
							onChange={(event) => setConfirmation(event.currentTarget.value)}
							disabled={loading}
							required
						/>
						{error && (
							<Text role="alert" c="red" size="sm">
								{error}
							</Text>
						)}
						<Group justify="flex-end">
							<Button variant="default" onClick={closeModal} disabled={loading}>
								Cancel
							</Button>
							<Button
								type="submit"
								color="red"
								loading={loading}
								disabled={confirmation !== name}
							>
								Delete repository
							</Button>
						</Group>
					</Stack>
				</form>
			</Modal>
		</Container>
	);
}
