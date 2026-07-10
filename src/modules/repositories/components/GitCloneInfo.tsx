import { ActionIcon, CopyButton, TextInput, Tooltip } from "@mantine/core";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import * as m from "#/paraglide/messages";

interface GitCloneInfoProps {
	organizationName?: string;
	userName?: string;
	name: string;
}

export default function GitCloneInfo({
	organizationName = "default",
	userName,
	name,
}: GitCloneInfoProps) {
	const [cloneUrl, setCloneUrl] = useState(
		userName
			? `/api/git/users/${userName}/${name}.git`
			: `/api/git/${organizationName}/${name}.git`,
	);

	useEffect(() => {
		const path = userName
			? `/api/git/users/${userName}/${name}.git`
			: `/api/git/${organizationName}/${name}.git`;
		setCloneUrl(`${window.location.origin}${path}`);
	}, [organizationName, userName, name]);

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
