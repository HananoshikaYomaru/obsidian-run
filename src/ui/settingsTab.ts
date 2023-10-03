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
	}
}
