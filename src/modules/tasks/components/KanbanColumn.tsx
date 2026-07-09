import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Button, Group, Select, Stack, Text } from "@mantine/core";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import * as m from "#/paraglide/messages";
import type { TaskCard, TaskColumn } from "../schemas";
import type { TaskBoardDragData as DragData } from "../task-board-dnd";

const CARD_DRAG_OPACITY = 0.45;
const COLUMN_DRAG_OPACITY = 0.55;

export const cardDragId = (id: string) => `card:${id}`;
export const columnDragId = (id: string) => `column:${id}`;

function SortableCard({
	card,
	onOpen,
}: {
	card: TaskCard;
	onOpen: (card: TaskCard) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: cardDragId(card.id),
		data: { type: "card", cardId: card.id } satisfies DragData,
	});
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? CARD_DRAG_OPACITY : 1,
	};
	return (
		<Box
			ref={setNodeRef}
			data-card-public-id={card.publicId}
			data-testid="task-card"
			style={{
				...style,
				border: "1px solid var(--mantine-color-default-border)",
				borderRadius: "var(--mantine-radius-sm)",
				background: "var(--mantine-color-body)",
			}}
			p="sm"
		>
			<Group justify="space-between" align="start" gap="xs" wrap="nowrap">
				<button
					type="button"
					onClick={() => onOpen(card)}
					style={{
						padding: 0,
						border: 0,
						background: "transparent",
						textAlign: "left",
						cursor: "pointer",
						flex: 1,
					}}
				>
					<Text size="xs" c="dimmed" fw={700}>
						{card.publicId}
					</Text>
					<Text size="sm" fw={600}>
						{card.title}
					</Text>
				</button>
				<Button
					variant="subtle"
					size="compact-xs"
					aria-label={m.tasks_board_dragCard_label({ id: card.publicId })}
					{...attributes}
					{...listeners}
				>
					<GripVertical size={14} />
				</Button>
			</Group>
		</Box>
	);
}

export default function KanbanColumn({
	canManage,
	cards,
	column,
	columns,
	deleteTarget,
	onAddCard,
	onDelete,
	onOpenCard,
	onRename,
	onTargetChange,
}: {
	canManage: boolean;
	cards: TaskCard[];
	column: TaskColumn;
	columns: TaskColumn[];
	deleteTarget?: string;
	onAddCard: (column: TaskColumn) => void;
	onDelete: (column: TaskColumn) => void;
	onOpenCard: (card: TaskCard) => void;
	onRename: (column: TaskColumn) => void;
	onTargetChange: (columnId: string, targetColumnId: string | null) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef: setSortableRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: columnDragId(column.id),
		data: { type: "column", columnId: column.id } satisfies DragData,
	});
	const { setNodeRef: setDroppableRef } = useDroppable({
		id: columnDragId(column.id),
		data: { type: "column", columnId: column.id } satisfies DragData,
	});
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? COLUMN_DRAG_OPACITY : 1,
	};
	const targetOptions = columns
		.filter((item) => item.id !== column.id)
		.map((item) => ({ value: item.id, label: item.name }));

	return (
		<Box
			ref={setSortableRef}
			data-column-name={column.name}
			data-testid="task-column"
			style={{
				...style,
				flex: "0 0 280px",
				border: "1px solid var(--mantine-color-default-border)",
				borderRadius: "var(--mantine-radius-md)",
				background: "var(--mantine-color-gray-light)",
			}}
			p="sm"
		>
			<Group justify="space-between" align="center" wrap="nowrap" mb="sm">
				<button
					type="button"
					onClick={() => canManage && onRename(column)}
					style={{
						padding: 0,
						border: 0,
						background: "transparent",
						textAlign: "left",
						cursor: canManage ? "pointer" : "default",
					}}
				>
					<Text fw={700}>{column.name}</Text>
					<Text size="xs" c="dimmed">
						{m.tasks_board_cardCount({ count: cards.length })}
					</Text>
				</button>
				{canManage && (
					<Button
						variant="subtle"
						size="compact-xs"
						aria-label={m.tasks_board_dragColumn_label({ name: column.name })}
						{...attributes}
						{...listeners}
					>
						<GripVertical size={14} />
					</Button>
				)}
			</Group>

			<Box
				ref={setDroppableRef}
				data-column-name={column.name}
				data-testid="task-column-dropzone"
				mih={80}
			>
				<SortableContext
					items={cards.map((card) => cardDragId(card.id))}
					strategy={verticalListSortingStrategy}
				>
					<Stack gap="xs">
						{cards.map((card) => (
							<SortableCard key={card.id} card={card} onOpen={onOpenCard} />
						))}
					</Stack>
				</SortableContext>
			</Box>

			{canManage && (
				<Stack gap="xs" mt="sm">
					<Button
						variant="light"
						size="xs"
						leftSection={<Plus size={14} />}
						onClick={() => onAddCard(column)}
					>
						{m.tasks_board_addCard_button()}
					</Button>
					{cards.length > 0 && (
						<Select
							size="xs"
							placeholder={m.tasks_board_deleteTarget_placeholder()}
							data={targetOptions}
							value={deleteTarget ?? null}
							onChange={(value) => onTargetChange(column.id, value)}
						/>
					)}
					<Button
						variant="subtle"
						color="red"
						size="xs"
						leftSection={<Trash2 size={14} />}
						onClick={() => onDelete(column)}
					>
						{m.tasks_board_deleteColumn_button()}
					</Button>
				</Stack>
			)}
		</Box>
	);
}
