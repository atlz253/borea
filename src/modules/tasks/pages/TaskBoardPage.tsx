import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
	Box,
	Button,
	Container,
	Group,
	Modal,
	Text,
	Textarea,
	TextInput,
	Title,
} from "@mantine/core";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import * as m from "#/paraglide/messages";
import KanbanColumn, {
	cardDragId,
	columnDragId,
	type DragData,
} from "../components/KanbanColumn";
import type { TaskBoardDetail, TaskCard, TaskColumn } from "../schemas";
import {
	createTaskCardFn,
	createTaskColumnFn,
	deleteTaskCardFn,
	deleteTaskColumnFn,
	getTaskBoardFn,
	updateTaskCardFn,
	updateTaskColumnFn,
} from "../server/task.functions";

interface TaskBoardPageProps {
	activeTaskPublicId?: string;
	board: TaskBoardDetail;
	canManage: boolean;
	organizationName: string;
}

function sortedColumns(board: TaskBoardDetail): TaskColumn[] {
	return [...board.columns].sort((a, b) => a.position - b.position);
}

function sortedCards(board: TaskBoardDetail, columnId: string): TaskCard[] {
	return board.cards
		.filter((card) => card.columnId === columnId)
		.sort((a, b) => a.position - b.position);
}

export default function TaskBoardPage({
	activeTaskPublicId,
	board: initialBoard,
	canManage,
	organizationName,
}: TaskBoardPageProps) {
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const [board, setBoard] = useState(initialBoard);
	const [activeDragId, setActiveDragId] = useState<string | null>(null);
	const [newColumnName, setNewColumnName] = useState("");
	const [addCardColumn, setAddCardColumn] = useState<TaskColumn | null>(null);
	const [cardTitle, setCardTitle] = useState("");
	const [cardDescription, setCardDescription] = useState("");
	const [deleteTargets, setDeleteTargets] = useState<Record<string, string>>(
		{},
	);
	const [error, setError] = useState<string | null>(null);
	const taskPublicIdFromUrl = pathname.match(
		new RegExp(`/tasks/${board.key}/([^/]+)$`),
	)?.[1];
	const rawSelectedTaskPublicId = activeTaskPublicId ?? taskPublicIdFromUrl;
	const selectedTaskPublicId = rawSelectedTaskPublicId
		? decodeURIComponent(rawSelectedTaskPublicId)
		: undefined;
	const selectedCard =
		selectedTaskPublicId === undefined
			? undefined
			: board.cards.find((card) => card.publicId === selectedTaskPublicId);
	const columns = useMemo(() => sortedColumns(board), [board]);
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const refresh = async () => {
		setBoard(
			await getTaskBoardFn({
				data: { organizationName, boardKey: board.key },
			}),
		);
	};

	const openCard = (card: TaskCard) => {
		void navigate({
			to: "/organizations/$organization/tasks/$boardKey/$taskPublicId",
			params: {
				organization: organizationName,
				boardKey: board.key,
				taskPublicId: card.publicId,
			},
		});
	};

	const closeCard = () => {
		void navigate({
			to: "/organizations/$organization/tasks/$boardKey",
			params: { organization: organizationName, boardKey: board.key },
		});
	};

	const createColumn = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		try {
			await createTaskColumnFn({
				data: { organizationName, boardKey: board.key, name: newColumnName },
			});
			setNewColumnName("");
			await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : m.tasks_board_error_column(),
			);
		}
	};

	const renameColumn = async (column: TaskColumn) => {
		const name = window.prompt(
			m.tasks_board_renameColumn_prompt(),
			column.name,
		);
		if (!name || name === column.name) {
			return;
		}
		setError(null);
		try {
			await updateTaskColumnFn({
				data: {
					organizationName,
					boardKey: board.key,
					columnId: column.id,
					name,
				},
			});
			await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : m.tasks_board_error_column(),
			);
		}
	};

	const deleteColumn = async (column: TaskColumn) => {
		if (
			!window.confirm(m.tasks_board_deleteColumn_confirm({ name: column.name }))
		) {
			return;
		}
		setError(null);
		try {
			await deleteTaskColumnFn({
				data: {
					organizationName,
					boardKey: board.key,
					columnId: column.id,
					targetColumnId: deleteTargets[column.id],
				},
			});
			await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : m.tasks_board_error_column(),
			);
		}
	};

	const createCard = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!addCardColumn) {
			return;
		}
		setError(null);
		try {
			const card = await createTaskCardFn({
				data: {
					organizationName,
					boardKey: board.key,
					columnId: addCardColumn.id,
					title: cardTitle,
					description: cardDescription,
				},
			});
			setAddCardColumn(null);
			setCardTitle("");
			setCardDescription("");
			await refresh();
			openCard(card);
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : m.tasks_board_error_card(),
			);
		}
	};

	const saveCard = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!selectedCard) {
			return;
		}
		const form = new FormData(event.currentTarget as HTMLFormElement);
		setError(null);
		try {
			await updateTaskCardFn({
				data: {
					organizationName,
					boardKey: board.key,
					taskPublicId: selectedCard.publicId,
					title: String(form.get("title") ?? ""),
					description: String(form.get("description") ?? ""),
				},
			});
			await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : m.tasks_board_error_card(),
			);
		}
	};

	const deleteCard = async () => {
		if (!selectedCard) {
			return;
		}
		if (
			!window.confirm(
				m.tasks_board_deleteCard_confirm({ id: selectedCard.publicId }),
			)
		) {
			return;
		}
		setError(null);
		try {
			await deleteTaskCardFn({
				data: {
					organizationName,
					boardKey: board.key,
					taskPublicId: selectedCard.publicId,
				},
			});
			closeCard();
			await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : m.tasks_board_error_card(),
			);
		}
	};

	const dragData = (eventItem: { data: { current?: unknown } }) =>
		eventItem.data.current as DragData | undefined;

	const handleDragStart = (event: DragStartEvent) => {
		setActiveDragId(String(event.active.id));
	};

	const moveColumn = async (activeData: DragData, overData: DragData) => {
		if (activeData.type !== "column" || overData.type !== "column") {
			return false;
		}
		const ordered = arrayMove(
			columns,
			columns.findIndex((column) => column.id === activeData.columnId),
			columns.findIndex((column) => column.id === overData.columnId),
		);
		await updateTaskColumnFn({
			data: {
				organizationName,
				boardKey: board.key,
				columnId: activeData.columnId,
				position: ordered.findIndex(
					(column) => column.id === activeData.columnId,
				),
			},
		});
		return true;
	};

	const moveCard = async (activeData: DragData, overData: DragData) => {
		if (activeData.type !== "card") {
			return false;
		}
		const activeCard = board.cards.find(
			(card) => card.id === activeData.cardId,
		);
		if (!activeCard) {
			return false;
		}
		const overCard =
			overData.type === "card"
				? board.cards.find((card) => card.id === overData.cardId)
				: undefined;
		const targetColumnId =
			overData.type === "column" ? overData.columnId : overCard?.columnId;
		if (!targetColumnId) {
			return false;
		}
		const targetCards = sortedCards(board, targetColumnId);
		const targetPosition =
			overData.type === "column"
				? targetCards.length
				: Math.max(
						0,
						targetCards.findIndex((card) => card.id === overData.cardId),
					);
		await updateTaskCardFn({
			data: {
				organizationName,
				boardKey: board.key,
				taskPublicId: activeCard.publicId,
				columnId: targetColumnId,
				position: targetPosition,
			},
		});
		return true;
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setActiveDragId(null);
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const activeData = dragData(active);
		const overData = dragData(over);
		if (!activeData || !overData || !canManage) {
			return;
		}
		setError(null);
		try {
			const moved =
				(await moveColumn(activeData, overData)) ||
				(await moveCard(activeData, overData));
			if (moved) await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : m.tasks_board_error_move(),
			);
		}
	};

	const overlayCard =
		activeDragId?.startsWith("card:") === true
			? board.cards.find((card) => cardDragId(card.id) === activeDragId)
			: undefined;

	return (
		<Container size="xl" py="xl">
			<Group justify="space-between" align="start" mb="md">
				<div>
					<Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">
						{board.key}
					</Text>
					<Title order={1}>{board.name}</Title>
					{board.description && <Text c="dimmed">{board.description}</Text>}
				</div>
				<Button
					variant="subtle"
					onClick={() =>
						void navigate({
							to: "/organizations/$organization/tasks",
							params: { organization: organizationName },
						})
					}
				>
					{m.tasks_board_back_button()}
				</Button>
			</Group>

			{error && (
				<Text role="alert" c="red" size="sm" mb="md">
					{error}
				</Text>
			)}

			<DndContext
				id={`task-board-${board.id}`}
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragEnd={(event) => void handleDragEnd(event)}
			>
				<SortableContext
					items={columns.map((column) => columnDragId(column.id))}
					strategy={verticalListSortingStrategy}
				>
					<Group
						align="stretch"
						wrap="nowrap"
						style={{ overflowX: "auto" }}
						pb="md"
					>
						{columns.map((column) => (
							<KanbanColumn
								key={column.id}
								canManage={canManage}
								cards={sortedCards(board, column.id)}
								column={column}
								columns={columns}
								deleteTarget={deleteTargets[column.id]}
								onAddCard={(item) => setAddCardColumn(item)}
								onDelete={(item) => void deleteColumn(item)}
								onOpenCard={openCard}
								onRename={(item) => void renameColumn(item)}
								onTargetChange={(columnId, targetColumnId) =>
									setDeleteTargets((current) => ({
										...current,
										...(targetColumnId ? { [columnId]: targetColumnId } : {}),
									}))
								}
							/>
						))}
					</Group>
				</SortableContext>
				<DragOverlay>
					{overlayCard ? (
						<Box
							p="sm"
							style={{
								border: "1px solid var(--mantine-color-default-border)",
								borderRadius: "var(--mantine-radius-sm)",
								background: "var(--mantine-color-body)",
							}}
						>
							<Text size="xs" c="dimmed" fw={700}>
								{overlayCard.publicId}
							</Text>
							<Text size="sm" fw={600}>
								{overlayCard.title}
							</Text>
						</Box>
					) : null}
				</DragOverlay>
			</DndContext>

			{canManage && (
				<Box
					mt="md"
					p="md"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
					}}
				>
					<form onSubmit={createColumn}>
						<Group align="end">
							<TextInput
								label={m.tasks_board_newColumn_label()}
								placeholder={m.tasks_board_newColumn_placeholder()}
								value={newColumnName}
								onChange={(event) =>
									setNewColumnName(event.currentTarget.value)
								}
								required
								style={{ flex: 1 }}
							/>
							<Button type="submit" leftSection={<Plus size={16} />}>
								{m.tasks_board_addColumn_button()}
							</Button>
						</Group>
					</form>
				</Box>
			)}

			<Modal
				opened={Boolean(addCardColumn)}
				onClose={() => setAddCardColumn(null)}
				title={m.tasks_board_createCard_title({
					name: addCardColumn?.name ?? "",
				})}
			>
				<form onSubmit={createCard}>
					<TextInput
						label={m.tasks_board_cardTitle_label()}
						value={cardTitle}
						onChange={(event) => setCardTitle(event.currentTarget.value)}
						required
					/>
					<Textarea
						label={m.tasks_board_cardDescription_label()}
						value={cardDescription}
						onChange={(event) => setCardDescription(event.currentTarget.value)}
						mt="md"
						autosize
						minRows={4}
					/>
					<Button type="submit" fullWidth mt="lg">
						{m.tasks_board_createCard_button()}
					</Button>
				</form>
			</Modal>

			<Modal
				opened={Boolean(selectedCard)}
				onClose={closeCard}
				title={selectedCard?.publicId}
				size="lg"
			>
				{selectedCard && (
					<form onSubmit={saveCard}>
						<TextInput
							name="title"
							label={m.tasks_board_cardTitle_label()}
							defaultValue={selectedCard.title}
							readOnly={!canManage}
							required
						/>
						<Textarea
							name="description"
							label={m.tasks_board_cardDescription_label()}
							defaultValue={selectedCard.description}
							readOnly={!canManage}
							mt="md"
							autosize
							minRows={6}
						/>
						{canManage && (
							<Group justify="space-between" mt="lg">
								<Button
									variant="subtle"
									color="red"
									leftSection={<Trash2 size={16} />}
									onClick={() => void deleteCard()}
								>
									{m.tasks_board_deleteCard_button()}
								</Button>
								<Button type="submit">{m.tasks_board_saveCard_button()}</Button>
							</Group>
						)}
					</form>
				)}
			</Modal>
		</Container>
	);
}
