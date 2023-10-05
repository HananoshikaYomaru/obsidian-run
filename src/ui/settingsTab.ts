import { App, PluginSettingTab, Setting } from "obsidian";
import RunPlugin from "../main";

export class SettingTab extends PluginSettingTab {
	plugin: RunPlugin;

	constructor(app: App, plugin: RunPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Generate ending tag metadata")

			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.generateEndingTagMetadata)
					.onChange(async (value) => {
						this.plugin.settings.generateEndingTagMetadata = value;
						await this.plugin.saveSettings();
					});
				return toggle;
			});

		new Setting(containerEl)
			.setName("Ignore folders")
			.setDesc("Folders to ignore. One folder per line.")
			.addTextArea((text) => {
				text.setPlaceholder("Enter folders to ignore")
					.setValue(this.plugin.settings.ignoredFolders.join("\n"))
					.onChange(async (_value) => {
						const folders = _value
							.trim()
							.split("\n")
							.filter((p) => p !== "");

						this.plugin.settings.ignoredFolders = folders;
						await this.plugin.saveSettings();
					});
				text.inputEl.style.minWidth = text.inputEl.style.maxWidth =
					"300px";
				text.inputEl.style.minHeight = "200px";
				return text;
			});
	}
}
