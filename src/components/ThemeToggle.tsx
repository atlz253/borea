import { Button, useMantineColorScheme } from "@mantine/core";
import { useCallback, useState } from "react";

type Scheme = "auto" | "light" | "dark";

function getStoredScheme(): Scheme {
	if (typeof window === "undefined") {
		return "auto";
	}
	const stored = window.localStorage.getItem("mantine-color-scheme-value");
	if (stored === "light" || stored === "dark" || stored === "auto") {
		return stored;
	}
	return "auto";
}

export default function ThemeToggle() {
	const { setColorScheme } = useMantineColorScheme();
	const [scheme, setScheme] = useState<Scheme>(getStoredScheme);

	const toggle = useCallback(() => {
		const next: Scheme =
			scheme === "light" ? "dark" : scheme === "dark" ? "auto" : "light";
		setScheme(next);
		setColorScheme(next);
	}, [scheme, setColorScheme]);

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
