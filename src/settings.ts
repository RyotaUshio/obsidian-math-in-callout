import { PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';


export interface MathInCalloutPluginSettings {
	callout: boolean;
	multiLine: boolean;
}

export const DEFAULT_SETTINGS: MathInCalloutPluginSettings = {
	callout: true,
	multiLine: true,
};

export class MathInCalloutSettingTab extends PluginSettingTab {
	constructor(public plugin: MyPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Render math in callouts')
			.setDesc("In Live Preview, the vanilla Obsidian doesn't render MathJax in callouts while editing them. Turn on this setting to enable it. This option requires a reload to take effect.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.callout)
				.onChange(async (value) => {
					this.plugin.settings.callout = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Make multi-line math blocks inside callouts and blockquotes consistent with Reading View')
			.setDesc('In Live Preview, the vanilla Obsidian misunderstands a ">" symbol at the beginning of a line in a blockquote or a callout as an inequality sign ("greater than") in multi-line math blocks, while Reading View properly recognizes them. Turn on this setting to make them consistent with Reading View.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.multiLine)
				.onChange(async (value) => {
					this.plugin.settings.multiLine = value;
					await this.plugin.saveSettings();
				}));
	}
}
