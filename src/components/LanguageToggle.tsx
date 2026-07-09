import { Menu, Text, UnstyledButton } from "@mantine/core";
import { Languages } from "lucide-react";
import { useState } from "react";
import { getLocale, locales, setLocale } from "#/paraglide/runtime";

const localeLabels: Record<string, string> = {
	en: "EN",
	ru: "RU",
};

type Locale = (typeof locales)[number];

export default function LanguageToggle() {
	const currentLocale = getLocale();
	const [opened, setOpened] = useState(false);

	const handleLocaleChange = (locale: Locale) => {
		setOpened(false);
		setLocale(locale);
	};

	return (
		<Menu
			key={currentLocale}
			opened={opened}
			onChange={setOpened}
			shadow="md"
			width={120}
		>
			<Menu.Target>
				<UnstyledButton
					style={{
						padding: "4px 8px",
						borderRadius: "var(--mantine-radius-sm)",
						cursor: "pointer",
					}}
				>
					<Text
						size="sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<Languages size={14} />
						{localeLabels[currentLocale] ?? currentLocale}
					</Text>
				</UnstyledButton>
			</Menu.Target>
			<Menu.Dropdown>
				{locales.map((locale) => (
					<Menu.Item
						key={locale}
						onClick={() => handleLocaleChange(locale)}
						fw={locale === currentLocale ? "bold" : "normal"}
					>
						{localeLabels[locale] ?? locale}
					</Menu.Item>
				))}
			</Menu.Dropdown>
		</Menu>
	);
}
