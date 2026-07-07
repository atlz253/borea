import { Button, useMantineColorScheme } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import * as m from "#/paraglide/messages";

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
				{m.shared_themeToggle_auto()}
			</Button>
		);
	}

	const label = m.shared_themeToggle_theme({ scheme });

	return (
		<Button
			onClick={toggle}
			variant="default"
			size="compact-sm"
			aria-label={label}
			title={label}
		>
			{scheme === "auto"
				? m.shared_themeToggle_auto()
				: scheme === "dark"
					? m.shared_themeToggle_dark()
					: m.shared_themeToggle_light()}
		</Button>
	);
}
