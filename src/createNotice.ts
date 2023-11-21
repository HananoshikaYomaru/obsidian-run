import { Notice } from "obsidian";
import dedent from "ts-dedent";

export function createNotice(
	message: string,
	color: "white" | "yellow" | "red" = "white",
	duration?: number
) {
	const fragment = new DocumentFragment();
	const desc = document.createElement("div");
	desc.setText(dedent`Obsidian Run: 
    ${message}`);
	desc.style.color = color;
	fragment.appendChild(desc);

	new Notice(fragment, duration ?? color === "red" ? 10000 : undefined);
}
