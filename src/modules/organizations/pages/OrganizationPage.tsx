import {
	Box,
	Button,
	Container,
	Group,
	Modal,
	Select,
	Stack,
	Text,
	Textarea,
	TextInput,
	Title,
} from "@mantine/core";
import { Trash2, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { OrganizationAccessSummary } from "../access-control.types";
import type { OrganizationMember, OrganizationRole } from "../schemas";
import {
	deleteOrganizationFn,
	inviteOrganizationMemberFn,
	removeOrganizationMemberFn,
	updateOrganizationFn,
	updateOrganizationMemberRoleFn,
} from "../server/organization.functions";

interface OrganizationPageProps {
	access: OrganizationAccessSummary;
	children: ReactNode;
	description?: string;
	members: OrganizationMember[];
	membershipEnabled: boolean;
	organizationName: string;
}

const roleLabels: Record<OrganizationRole, string> = {
	owner: "Owner",
	administrator: "Administrator",
	moderator: "Moderator",
	member: "Member",
};

function assignableRoles(
	actorRole: OrganizationRole | undefined,
	targetRole: OrganizationRole,
): OrganizationRole[] {
	if (actorRole === "owner" && targetRole !== "owner") {
		return ["member", "moderator", "administrator", "owner"];
	}
	if (
		actorRole === "administrator" &&
		(targetRole === "member" || targetRole === "moderator")
	) {
		return ["member", "moderator"];
	}
	return [];
}

function canRemove(
	actorRole: OrganizationRole | undefined,
	targetRole: OrganizationRole,
): boolean {
	if (actorRole === "owner") {
		return targetRole !== "owner";
	}
	if (actorRole === "administrator") {
		return targetRole === "moderator" || targetRole === "member";
	}
	return actorRole === "moderator" && targetRole === "member";
}

function OrganizationMembers({
	access,
	initialMembers,
	organizationName,
}: {
	access: OrganizationAccessSummary;
	initialMembers: OrganizationMember[];
	organizationName: string;
}) {
	const [members, setMembers] = useState(initialMembers);
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleInvite = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const member = await inviteOrganizationMemberFn({
				data: { organizationName, email },
			});
			setMembers((current) => [...current, member]);
			setEmail("");
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Failed to invite member",
			);
		} finally {
			setLoading(false);
		}
	};

	const updateRole = async (
		member: OrganizationMember,
		role: OrganizationRole | null,
	) => {
		if (!role || role === member.role) {
			return;
		}
		if (
			role === "owner" &&
			!window.confirm(`Transfer organization ownership to ${member.name}?`)
		) {
			return;
		}
		setError(null);
		try {
			const updated = await updateOrganizationMemberRoleFn({
				data: { organizationName, userId: member.id, role },
			});
			setMembers((current) =>
				current.map((item) => {
					if (item.id === updated.id) {
						return updated;
					}
					if (role === "owner" && item.role === "owner") {
						return { ...item, role: "member" };
					}
					return item;
				}),
			);
			if (role === "owner") {
				window.location.reload();
			}
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Failed to update role",
			);
		}
	};

	const removeMember = async (member: OrganizationMember) => {
		if (!window.confirm(`Remove ${member.name} from the organization?`)) {
			return;
		}
		setError(null);
		try {
			await removeOrganizationMemberFn({
				data: { organizationName, userId: member.id },
			});
			setMembers((current) => current.filter((item) => item.id !== member.id));
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Failed to remove member",
			);
		}
	};

	return (
		<Box
			p="md"
			style={{
				border: "1px solid var(--mantine-color-default-border)",
				borderRadius: "var(--mantine-radius-md)",
			}}
		>
			<Title order={2} size="h3" mb="md">
				Members
			</Title>
			<Stack gap="sm">
				{members.map((member) => {
					const roles = assignableRoles(access.role, member.role);
					return (
						<Group key={member.id} justify="space-between" wrap="nowrap">
							<div>
								<Text fw={500}>{member.name}</Text>
								<Text size="sm" c="dimmed">
									{member.email}
								</Text>
							</div>
							<Group wrap="nowrap">
								{roles.length > 0 ? (
									<Select
										aria-label={`Role for ${member.email}`}
										data={roles.map((role) => ({
											value: role,
											label: roleLabels[role],
										}))}
										value={member.role}
										allowDeselect={false}
										onChange={(role) =>
											void updateRole(member, role as OrganizationRole | null)
										}
										w={160}
									/>
								) : (
									<Text size="sm">{roleLabels[member.role]}</Text>
								)}
								{canRemove(access.role, member.role) && (
									<Button
										color="red"
										variant="subtle"
										size="xs"
										onClick={() => void removeMember(member)}
									>
										Remove
									</Button>
								)}
							</Group>
						</Group>
					);
				})}
			</Stack>
			{access.canInviteMembers && (
				<form onSubmit={handleInvite}>
					<Group align="end" mt="lg">
						<TextInput
							label="Invite member by email"
							placeholder="user@example.com"
							required
							type="email"
							value={email}
							onChange={(event) => setEmail(event.currentTarget.value)}
							style={{ flex: 1 }}
						/>
						<Button
							type="submit"
							leftSection={<UserPlus size={16} />}
							loading={loading}
						>
							Invite member
						</Button>
					</Group>
				</form>
			)}
			{error && (
				<Text role="alert" c="red" size="sm" mt="sm">
					{error}
				</Text>
			)}
		</Box>
	);
}

function OrganizationSettings({
	access,
	initialDescription,
	organizationName,
}: {
	access: OrganizationAccessSummary;
	initialDescription: string;
	organizationName: string;
}) {
	const [description, setDescription] = useState(initialDescription);
	const [confirmation, setConfirmation] = useState("");
	const [deleteOpened, setDeleteOpened] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const save = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			await updateOrganizationFn({
				data: { organizationName, description },
			});
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Failed to update organization",
			);
		} finally {
			setLoading(false);
		}
	};

	const deleteOrganization = async () => {
		setLoading(true);
		setError(null);
		try {
			await deleteOrganizationFn({ data: { organizationName } });
			window.location.assign("/organizations");
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Failed to delete organization",
			);
			setLoading(false);
		}
	};

	return (
		<Stack mt="lg">
			{access.canManageSettings && (
				<Box
					p="md"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
					}}
				>
					<Title order={2} size="h3" mb="md">
						Organization settings
					</Title>
					<form onSubmit={save}>
						<Textarea
							label="Description"
							value={description}
							onChange={(event) => setDescription(event.currentTarget.value)}
							maxLength={500}
							autosize
							minRows={2}
						/>
						<Button type="submit" mt="md" loading={loading}>
							Save settings
						</Button>
					</form>
				</Box>
			)}
			{access.canDeleteOrganization && (
				<Box
					p="md"
					style={{
						border: "1px solid var(--mantine-color-red-6)",
						borderRadius: "var(--mantine-radius-md)",
					}}
				>
					<Group justify="space-between">
						<div>
							<Text fw={700}>Delete organization</Text>
							<Text size="sm" c="dimmed">
								Permanently deletes all repositories and pull requests.
							</Text>
						</div>
						<Button
							color="red"
							leftSection={<Trash2 size={16} />}
							onClick={() => setDeleteOpened(true)}
						>
							Delete organization
						</Button>
					</Group>
				</Box>
			)}
			{error && (
				<Text role="alert" c="red" size="sm">
					{error}
				</Text>
			)}
			<Modal
				opened={deleteOpened}
				onClose={() => setDeleteOpened(false)}
				title="Delete organization"
				centered
			>
				<Stack>
					<Text size="sm">
						Enter <strong>{organizationName}</strong> to confirm.
					</Text>
					<TextInput
						label="Organization name"
						value={confirmation}
						onChange={(event) => setConfirmation(event.currentTarget.value)}
					/>
					<Button
						color="red"
						loading={loading}
						disabled={confirmation !== organizationName}
						onClick={() => void deleteOrganization()}
					>
						Delete organization
					</Button>
				</Stack>
			</Modal>
		</Stack>
	);
}

export default function OrganizationPage({
	access,
	children,
	description = "",
	members,
	membershipEnabled,
	organizationName,
}: OrganizationPageProps) {
	return (
		<>
			{children}
			{membershipEnabled && (
				<Container size="lg" pb="xl">
					<OrganizationMembers
						access={access}
						initialMembers={members}
						organizationName={organizationName}
					/>
					<OrganizationSettings
						access={access}
						initialDescription={description}
						organizationName={organizationName}
					/>
				</Container>
			)}
		</>
	);
}
