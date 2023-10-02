// this file copied from : https://github.com/platers/obsidian-linter/blob/eca9027abb34d564eb4a670cd4474691eda699da/src/typings/obsidian-ex.d.ts

import { Command } from "obsidian";

export interface ObsidianCommandInterface {
	executeCommandById(id: string): void;
	commands: {
		"editor:save-file": {
			callback(): void;
		};
	};
	listCommands(): Command[];
}

// allows for the removal of the any cast by defining some extra properties for Typescript so it knows these properties exist
declare module "obsidian" {
	interface App {
		commands: ObsidianCommandInterface;
		dom: {
			appContainerEl: HTMLElement;
		};
	}

	interface Vault {
		getConfig(id: string): boolean;
	}
}

declare global {
	interface Window {
		CodeMirrorAdapter: {
			commands: {
				save(): void;
			};
		};
	}
}
