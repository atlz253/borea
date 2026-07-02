import {
	Box,
	Button,
	Container,
	Group,
	Stack,
	Text,
	Textarea,
	TextInput,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import type { Organization } from "../schemas";
import { createOrganizationFn } from "../server/organization.functions";

export default function OrganizationsPage({
	organizations,
}: {
	organizations: Organization[];
}) {
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const organization = await createOrganizationFn({
				data: { name, description },
			});
			window.location.assign(`/organizations/${organization.name}`);
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Failed to create organization",
			);
			setLoading(false);
		}
	};

	return (
		<Container size="lg" py="xl">
			<Group justify="space-between" mb="md">
				<Title order={1}>Organizations</Title>
				<Button
					leftSection={<Plus size={16} />}
					onClick={() => setShowForm(true)}
				>
					New organization
				</Button>
			</Group>

			{organizations.length === 0 ? (
				<Text c="dimmed">No organizations yet.</Text>
			) : (
				<Stack gap="xs">
					{organizations.map((organization) => (
						<Group key={organization.name} gap="sm">
							<Building2 size={16} />
							<Link
								to="/organizations/$organization"
								params={{ organization: organization.name }}
								style={{
									color: "var(--mantine-color-anchor-color)",
									textDecoration: "none",
								}}
							>
								{organization.name}
							</Link>
							{organization.description && (
								<Text size="sm" c="dimmed">
									{organization.description}
								</Text>
							)}
						</Group>
					))}
				</Stack>
			)}

			{showForm && (
				<Box
					mt="lg"
					p="md"
					style={{
						border: "1px solid var(--mantine-color-default-border)",
						borderRadius: "var(--mantine-radius-md)",
					}}
				>
					<form onSubmit={handleSubmit}>
						<TextInput
							label="Organization name"
							placeholder="my-team"
							required
							value={name}
							onChange={(event) => setName(event.currentTarget.value)}
						/>
						<Textarea
							label="Description (optional)"
							mt="md"
							value={description}
							onChange={(event) => setDescription(event.currentTarget.value)}
						/>
						{error && (
							<Text role="alert" c="red" size="sm" mt="sm">
								{error}
							</Text>
						)}
						<Button type="submit" mt="lg" loading={loading}>
							Create organization
						</Button>
					</form>
				</Box>
			)}
		</Container>
	);
}
