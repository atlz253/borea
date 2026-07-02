import {
	Alert,
	Button,
	Container,
	Paper,
	PasswordInput,
	Stack,
	Tabs,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { useState } from "react";
import { loginFn, registerFn } from "../server/auth.functions";

export default function AuthPage({ redirectTo }: { redirectTo: string }) {
	const [tab, setTab] = useState<string | null>("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			if (tab === "register") {
				await registerFn({ data: { name, email, password } });
			} else {
				await loginFn({ data: { email, password } });
			}
			window.location.assign(redirectTo);
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Authentication failed",
			);
			setLoading(false);
		}
	};

	return (
		<Container size={420} py={80}>
			<Title ta="center">Nirvana</Title>
			<Text c="dimmed" size="sm" ta="center" mt="xs">
				Sign in or create an account
			</Text>
			<Paper withBorder shadow="sm" p="xl" mt="xl" radius="md">
				<Tabs
					value={tab}
					onChange={(value) => {
						setTab(value);
						setError(null);
					}}
				>
					<Tabs.List grow>
						<Tabs.Tab value="login">Sign in</Tabs.Tab>
						<Tabs.Tab value="register">Register</Tabs.Tab>
					</Tabs.List>
				</Tabs>
				<form onSubmit={(event) => void submit(event)}>
					<Stack mt="lg">
						{tab === "register" && (
							<TextInput
								label="Name"
								required
								value={name}
								onChange={(event) => setName(event.currentTarget.value)}
							/>
						)}
						<TextInput
							label="Email"
							type="email"
							required
							value={email}
							onChange={(event) => setEmail(event.currentTarget.value)}
						/>
						<PasswordInput
							label="Password"
							required
							value={password}
							onChange={(event) => setPassword(event.currentTarget.value)}
						/>
						{error && <Alert color="red">{error}</Alert>}
						<Button type="submit" loading={loading}>
							{tab === "register" ? "Create account" : "Sign in"}
						</Button>
					</Stack>
				</form>
			</Paper>
		</Container>
	);
}
