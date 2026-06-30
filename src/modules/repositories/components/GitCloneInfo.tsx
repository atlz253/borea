import { ActionIcon, CopyButton, TextInput, Tooltip } from "@mantine/core";
import { Check, Copy } from "lucide-react";

interface GitCloneInfoProps {
	name: string;
}

export default function GitCloneInfo({ name }: GitCloneInfoProps) {
	const cloneUrl = `${window.location.origin}/api/git/${name}.git`;

	return (
		<TextInput
			label="Git pull URL"
			description="Clone this repository over HTTP"
			value={cloneUrl}
			readOnly
			size="sm"
			rightSection={
				<CopyButton value={cloneUrl} timeout={2000}>
					{({ copied, copy }) => (
						<Tooltip
							label={copied ? "Copied" : "Copy"}
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
