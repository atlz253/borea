import {
	Box,
	Button,
	Container,
	Group,
	Text,
	Textarea,
	TextInput,
	Title,
} from "@mantine/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import RepositoryList from "../components/RepositoryList";
import type { Repository } from "../schemas";
import { createRepositoryFn } from "../server/repository.functions";

interface RepositoriesPageProps {
	organizationName?: string;
	repositories: Repository[];
}

export default function RepositoriesPage({
	organizationName = "default",
	repositories,
}: RepositoriesPageProps) {
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			await createRepositoryFn({
				data: { organizationName, name, description },
			});
			setName("");
			setDescription("");
			setShowForm(false);
			window.location.reload();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create repository",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Container size="lg" py="xl">
			<Group justify="space-between" mb="md">
				<div>
					<Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">
						Organization
					</Text>
					<Title order={1}>{organizationName}</Title>
				</div>
				<Button
					leftSection={<Plus size={16} />}
					onClick={() => setShowForm(true)}
				>
					New repository
				</Button>
			</Group>

			<RepositoryList repositories={repositories} />

			{showForm && (
				<Box
					mt="lg"
					p="md"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
					}}
				>
					<Text fw={600} mb="sm">
						Create repository
					</Text>
					<form onSubmit={handleSubmit}>
						<TextInput
							label="Repository name"
							placeholder="my-repository"
							required
							value={name}
							onChange={(e) => setName(e.currentTarget.value)}
						/>
						<Textarea
							label="Description (optional)"
							placeholder="A short description of the repository"
							mt="md"
							value={description}
							onChange={(e) => setDescription(e.currentTarget.value)}
							autosize
							minRows={2}
							maxRows={4}
						/>
						{error && (
							<Text c="red" size="sm" mt="sm">
								{error}
							</Text>
						)}
						<Button type="submit" fullWidth mt="lg" loading={loading}>
							Create repository
						</Button>
					</form>
				</Box>
			)}
		</Container>
	);
}
