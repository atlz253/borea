import { Menu, Text, UnstyledButton } from "@mantine/core";
import { Languages } from "lucide-react";
import { getLocale, locales, setLocale } from "#/paraglide/runtime";

const localeLabels: Record<string, string> = {
	en: "EN",
	ru: "RU",
};

export default function LanguageToggle() {
	const currentLocale = getLocale();

	return (
		<Menu shadow="md" width={120}>
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
						onClick={() => setLocale(locale)}
						fw={locale === currentLocale ? "bold" : "normal"}
					>
						{localeLabels[locale] ?? locale}
					</Menu.Item>
				))}
			</Menu.Dropdown>
		</Menu>
	);
}
