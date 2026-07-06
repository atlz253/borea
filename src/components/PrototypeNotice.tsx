import { notifications } from "@mantine/notifications";
import { ShieldAlert } from "lucide-react";
import { useEffect } from "react";

const NOTIFICATION_ID = "prototype-notice";

export default function PrototypeNotice() {
	useEffect(() => {
		const id = NOTIFICATION_ID;

		notifications.show({
			id,
			title: "Prototype",
			message:
				"This project is at the prototype stage. Data preservation is not guaranteed — back up your data or do not use for production repositories.",
			color: "orange",
			icon: <ShieldAlert size={18} />,
			position: "bottom-right",
			autoClose: false,
			withCloseButton: true,
			allowClose: true,
		});

		function handleInteraction() {
			notifications.hide(id);
		}

		document.addEventListener("pointerdown", handleInteraction, { once: true });
		document.addEventListener("keydown", handleInteraction, { once: true });

		return () => {
			notifications.hide(id);
			document.removeEventListener("pointerdown", handleInteraction);
			document.removeEventListener("keydown", handleInteraction);
		};
	}, []);

	return null;
}
