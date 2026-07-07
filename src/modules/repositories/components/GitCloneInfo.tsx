import { ActionIcon, CopyButton, TextInput, Tooltip } from "@mantine/core";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import * as m from "#/paraglide/messages";

interface GitCloneInfoProps {
	organizationName?: string;
	name: string;
}

export default function GitCloneInfo({
	organizationName = "default",
	name,
}: GitCloneInfoProps) {
	const [cloneUrl, setCloneUrl] = useState(
		`/api/git/${organizationName}/${name}.git`,
	);

	useEffect(() => {
		setCloneUrl(
			`${window.location.origin}/api/git/${organizationName}/${name}.git`,
		);
	}, [organizationName, name]);

	return (
		<TextInput
			label={m.repositories_gitCloneInfo_url_label()}
			description={m.repositories_gitCloneInfo_description()}
			value={cloneUrl}
			readOnly
			size="sm"
			rightSection={
				<CopyButton value={cloneUrl} timeout={2000}>
					{({ copied, copy }) => (
						<Tooltip
							label={
								copied
									? m.repositories_gitCloneInfo_copied_tooltip()
									: m.repositories_gitCloneInfo_copy_tooltip()
							}
							withArrow
							position="top"
						>
							<ActionIcon
								color={copied ? "teal" : "gray"}
								variant="subtle"
								onClick={copy}
							>
								{copied ? <Check size={16} /> : <Copy size={16} />}
							</ActionIcon>
						</Tooltip>
					)}
				</CopyButton>
			}
		/>
	);
}
