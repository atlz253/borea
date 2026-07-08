import {
	Box,
	Button,
	Container,
	Group,
	SimpleGrid,
	Text,
	Textarea,
	TextInput,
	Title,
} from "@mantine/core";
import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import * as m from "#/paraglide/messages";
import type { TaskBoard } from "../schemas";
import { createTaskBoardFn } from "../server/task.functions";

interface TaskBoardsPageProps {
	boards: TaskBoard[];
	canManage: boolean;
	organizationName: string;
}

export default function TaskBoardsPage({
	boards,
	canManage,
	organizationName,
}: TaskBoardsPageProps) {
	const [showForm, setShowForm] = useState(false);
	const [key, setKey] = useState("");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const board = await createTaskBoardFn({
				data: { organizationName, key, name, description },
			});
			window.location.assign(
				`/organizations/${organizationName}/tasks/${board.key}`,
			);
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: m.tasks_boards_error_create(),
			);
			setLoading(false);
		}
	};

	return (
		<Container size="lg" py="xl">
			<Group justify="space-between" mb="md">
				<div>
					<Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">
						{m.tasks_boards_section_label()}
					</Text>
					<Title order={1}>{m.tasks_boards_title()}</Title>
				</div>
				{canManage && (
					<Button
						leftSection={<Plus size={16} />}
						onClick={() => setShowForm(true)}
					>
						{m.tasks_boards_new_button()}
					</Button>
				)}
			</Group>

			{boards.length === 0 ? (
				<Box
					p="xl"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
						textAlign: "center",
					}}
				>
					<ClipboardList size={28} />
					<Text fw={600} mt="sm">
						{m.tasks_boards_empty_heading()}
					</Text>
					<Text c="dimmed" size="sm">
						{m.tasks_boards_empty_body()}
					</Text>
				</Box>
			) : (
				<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
					{boards.map((board) => (
						<Box
							key={board.id}
							p="md"
							style={{
								border: "1px solid var(--mantine-color-default-border)",
								borderRadius: "var(--mantine-radius-md)",
							}}
						>
							<Group justify="space-between" align="start">
								<div>
									<Text fw={700}>{board.name}</Text>
									<Text size="sm" c="dimmed">
										{board.key}
									</Text>
								</div>
								<Button
									component="a"
									href={`/organizations/${organizationName}/tasks/${board.key}`}
									variant="light"
									size="xs"
								>
									{m.tasks_boards_open_button()}
								</Button>
							</Group>
							{board.description && (
								<Text size="sm" mt="sm">
									{board.description}
								</Text>
							)}
						</Box>
					))}
				</SimpleGrid>
			)}

			{canManage && showForm && (
				<Box
					mt="lg"
					p="md"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
					}}
				>
					<Text fw={600} mb="sm">
						{m.tasks_boards_create_heading()}
					</Text>
					<form onSubmit={submit}>
						<Group grow align="start">
							<TextInput
								label={m.tasks_boards_key_label()}
								placeholder={m.tasks_boards_key_placeholder()}
								required
								value={key}
								onChange={(event) => setKey(event.currentTarget.value)}
							/>
							<TextInput
								label={m.tasks_boards_name_label()}
								placeholder={m.tasks_boards_name_placeholder()}
								required
								value={name}
								onChange={(event) => setName(event.currentTarget.value)}
							/>
						</Group>
						<Textarea
							label={m.tasks_boards_description_label()}
							mt="md"
							value={description}
							onChange={(event) => setDescription(event.currentTarget.value)}
							autosize
							minRows={2}
						/>
						{error && (
							<Text role="alert" c="red" size="sm" mt="sm">
								{error}
							</Text>
						)}
						<Group justify="end" mt="lg">
							<Button variant="subtle" onClick={() => setShowForm(false)}>
								{m.tasks_cancel_button()}
							</Button>
							<Button type="submit" loading={loading}>
								{m.tasks_boards_create_button()}
							</Button>
						</Group>
					</form>
				</Box>
			)}
		</Container>
	);
}
