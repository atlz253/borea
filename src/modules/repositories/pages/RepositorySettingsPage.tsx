import {
	Box,
	Button,
	Container,
	Group,
	Modal,
	Select,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import type {
	OrganizationMember,
	RepositoryAccessSummary,
	RepositoryMember,
	RepositoryRole,
} from "#/modules/organizations";
import {
	removeRepositoryMemberFn,
	setRepositoryMemberRoleFn,
} from "#/modules/organizations";
import { deleteRepositoryFn } from "../server/repository.functions";

interface RepositorySettingsPageProps {
	access?: RepositoryAccessSummary;
	members?: OrganizationMember[];
	organizationName?: string;
	name: string;
	onDeleted?: () => void;
	repositoryMembers?: RepositoryMember[];
}

const roleLabels: Record<RepositoryRole, string> = {
	read: "Read",
	write: "Write",
	moderator: "Moderator",
};

const defaultAccess: RepositoryAccessSummary = {
	isOwner: false,
	canRead: true,
	canWrite: true,
	canManageAccess: false,
	canAssignRepositoryModerator: false,
	canDelete: true,
};

function RepositoryAccessManager({
	access,
	initialMembers,
	organizationMembers,
	organizationName,
	repositoryName,
}: {
	access: RepositoryAccessSummary;
	initialMembers: RepositoryMember[];
	organizationMembers: OrganizationMember[];
	organizationName: string;
	repositoryName: string;
}) {
	const [repositoryMembers, setRepositoryMembers] = useState(initialMembers);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [selectedRole, setSelectedRole] = useState<RepositoryRole>("read");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const candidates = useMemo(() => {
		const assigned = new Set(repositoryMembers.map((member) => member.id));
		return organizationMembers.filter(
			(member) =>
				member.role === "member" &&
				member.id !== access.ownerId &&
				!assigned.has(member.id),
		);
	}, [access.ownerId, organizationMembers, repositoryMembers]);

	const roleOptions = (
		access.canAssignRepositoryModerator
			? ["read", "write", "moderator"]
			: ["read", "write"]
	).map((role) => ({
		value: role,
		label: roleLabels[role as RepositoryRole],
	}));

	const setRole = async (userId: string, role: RepositoryRole) => {
		setError(null);
		setLoading(true);
		try {
			const updated = await setRepositoryMemberRoleFn({
				data: {
					organizationName,
					repositoryName,
					userId,
					role,
				},
			});
			setRepositoryMembers((current) => {
				const exists = current.some((member) => member.id === updated.id);
				return exists
					? current.map((member) =>
							member.id === updated.id ? updated : member,
						)
					: [...current, updated];
			});
			setSelectedUserId(null);
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Failed to update repository access",
			);
		} finally {
			setLoading(false);
		}
	};

	const remove = async (member: RepositoryMember) => {
		setError(null);
		setLoading(true);
		try {
			await removeRepositoryMemberFn({
				data: {
					organizationName,
					repositoryName,
					userId: member.id,
				},
			});
			setRepositoryMembers((current) =>
				current.filter((item) => item.id !== member.id),
			);
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Failed to remove repository access",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			p="lg"
			style={{
				border: "1px solid var(--mantine-color-default-border)",
				borderRadius: "var(--mantine-radius-md)",
			}}
		>
			<Title order={2} size="h3" mb="md">
				Repository access
			</Title>
			{access.ownerId && (
				<Text size="sm" c="dimmed" mb="md">
					Owner:{" "}
					{organizationMembers.find((member) => member.id === access.ownerId)
						?.email ?? access.ownerId}
				</Text>
			)}
			<Stack gap="sm">
				{repositoryMembers.map((member) => {
					const canChange =
						access.canAssignRepositoryModerator || member.role !== "moderator";
					return (
						<Group key={member.id} justify="space-between">
							<div>
								<Text fw={500}>{member.name}</Text>
								<Text size="sm" c="dimmed">
									{member.email}
								</Text>
							</div>
							<Group>
								<Select
									aria-label={`Repository role for ${member.email}`}
									data={roleOptions}
									value={member.role}
									disabled={!canChange || loading}
									allowDeselect={false}
									onChange={(role) => {
										if (role) {
											void setRole(member.id, role as RepositoryRole);
										}
									}}
									w={140}
								/>
								{canChange && (
									<Button
										color="red"
										variant="subtle"
										size="xs"
										disabled={loading}
										onClick={() => void remove(member)}
									>
										Remove
									</Button>
								)}
							</Group>
						</Group>
					);
				})}
			</Stack>
			<Group align="end" mt="lg">
				<Select
					label="Organization member"
					placeholder="Select member"
					searchable
					data={candidates.map((member) => ({
						value: member.id,
						label: `${member.name} (${member.email})`,
					}))}
					value={selectedUserId}
					onChange={setSelectedUserId}
					nothingFoundMessage="No eligible members"
					style={{ flex: 1 }}
				/>
				<Select
					label="Role"
					data={roleOptions}
					value={selectedRole}
					allowDeselect={false}
					onChange={(role) => {
						if (role) {
							setSelectedRole(role as RepositoryRole);
						}
					}}
					w={140}
				/>
				<Button
					leftSection={<UserPlus size={16} />}
					loading={loading}
					disabled={!selectedUserId}
					onClick={() => {
						if (selectedUserId) {
							void setRole(selectedUserId, selectedRole);
						}
					}}
				>
					Add
				</Button>
			</Group>
			{error && (
				<Text role="alert" c="red" size="sm" mt="sm">
					{error}
				</Text>
			)}
		</Box>
	);
}

export default function RepositorySettingsPage({
	access = defaultAccess,
	members = [],
	organizationName = "default",
	name,
	onDeleted = () =>
		window.location.assign(`/organizations/${organizationName}`),
	repositoryMembers = [],
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
			await deleteRepositoryFn({
				data: { organizationName, name, confirmation },
			});
			onDeleted();
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Failed to delete repository",
			);
			setLoading(false);
		}
	};

	return (
		<Container size="lg" py="xl">
			<Title order={1} mb="lg">
				Repository settings
			</Title>

			<Stack>
				{access.canManageAccess && (
					<RepositoryAccessManager
						access={access}
						initialMembers={repositoryMembers}
						organizationMembers={members}
						organizationName={organizationName}
						repositoryName={name}
					/>
				)}

				{access.canDelete && (
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
									Permanently delete this repository and all pull requests.
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
				)}

				{!access.canManageAccess && !access.canDelete && (
					<Text c="dimmed">No repository settings are available.</Text>
				)}
			</Stack>

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
