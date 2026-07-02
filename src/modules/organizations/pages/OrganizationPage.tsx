import {
	Box,
	Button,
	Container,
	Group,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { User } from "#/modules/auth";
import { inviteOrganizationMemberFn } from "../server/organization.functions";

interface OrganizationPageProps {
	children: ReactNode;
	members: User[];
	membershipEnabled: boolean;
	organizationName: string;
}

function OrganizationMembers({
	initialMembers,
	organizationName,
}: {
	initialMembers: User[];
	organizationName: string;
}) {
	const [members, setMembers] = useState(initialMembers);
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
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
			<Stack gap="xs">
				{members.map((member) => (
					<Group key={member.id} justify="space-between">
						<Text fw={500}>{member.name}</Text>
						<Text size="sm" c="dimmed">
							{member.email}
						</Text>
					</Group>
				))}
			</Stack>
			<form onSubmit={handleSubmit}>
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
				{error && (
					<Text role="alert" c="red" size="sm" mt="sm">
						{error}
					</Text>
				)}
			</form>
		</Box>
	);
}

export default function OrganizationPage({
	children,
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
						initialMembers={members}
						organizationName={organizationName}
					/>
				</Container>
			)}
		</>
	);
}
