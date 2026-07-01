import { Button, useMantineColorScheme } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";

type Scheme = "auto" | "light" | "dark";

export default function ThemeToggle() {
	const { setColorScheme } = useMantineColorScheme();
	const [mounted, setMounted] = useState(false);
	const [scheme, setScheme] = useState<Scheme>("auto");

	useEffect(() => {
		setMounted(true);
		const stored = window.localStorage.getItem("mantine-color-scheme-value");
		if (stored === "light" || stored === "dark" || stored === "auto") {
			setScheme(stored);
		}
	}, []);

	const toggle = useCallback(() => {
		const next: Scheme =
			scheme === "light" ? "dark" : scheme === "dark" ? "auto" : "light";
		setScheme(next);
		setColorScheme(next);
	}, [scheme, setColorScheme]);

	if (!mounted) {
		return (
			<Button variant="default" size="compact-sm" disabled>
				Auto
			</Button>
		);
	}

	const label = `Theme: ${scheme}`;

	return (
		<Button
			onClick={toggle}
			variant="default"
			size="compact-sm"
			aria-label={label}
			title={label}
		>
			{scheme === "auto" ? "Auto" : scheme === "dark" ? "Dark" : "Light"}
		</Button>
	);
}
