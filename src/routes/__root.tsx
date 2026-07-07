import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";
import "@mantine/notifications/styles.css";
import "../styles/code-highlight.css";
import {
	CodeHighlightAdapterProvider,
	createHighlightJsAdapter,
} from "@mantine/code-highlight";
import {
	ColorSchemeScript,
	MantineProvider,
	mantineHtmlProps,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import hljs from "highlight.js";
import { getLocale } from "#/paraglide/runtime";
import PrototypeNotice from "../components/PrototypeNotice";
import { theme } from "../theme";

const codeHighlightAdapter = createHighlightJsAdapter(hljs);

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Borea" },
			{
				httpEquiv: "Content-Security-Policy",
				content:
					"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com 'self'; img-src 'self' data:; connect-src 'self' ws: wss:;",
			},
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang={getLocale()} {...mantineHtmlProps}>
			<head>
				<ColorSchemeScript defaultColorScheme="auto" />
				<HeadContent />
			</head>
			<body>
				<MantineProvider
					theme={theme}
					defaultColorScheme="auto"
					deduplicateInlineStyles
				>
					<CodeHighlightAdapterProvider adapter={codeHighlightAdapter}>
						{children}
					</CodeHighlightAdapterProvider>
					<Notifications
						position="bottom-right"
						zIndex={300}
						autoClose={false}
					/>
					<PrototypeNotice />
				</MantineProvider>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
