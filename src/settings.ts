import { PluginSettingTab, Setting } from 'obsidian';
import type MyPlugin from 'main';


export interface MathInCalloutSettings {
    notification: boolean;
}

export const DEFAULT_SETTINGS: MathInCalloutSettings = {
    notification: true,
};

// Inspired by https://stackoverflow.com/a/50851710/13613783
export type KeysOfType<Obj, Type> = NonNullable<{ [k in keyof Obj]: Obj[k] extends Type ? k : never }[keyof Obj]>;

export class MathInCalloutSettingTab extends PluginSettingTab {
	constructor(public plugin: MyPlugin) {
		super(plugin.app, plugin);
	}
	
	display(): void {
		this.containerEl.empty();

        new Setting(this.containerEl)
            .setDesc('If something is not working, type some math expression outside callouts in Live Preview.');

        new Setting(this.containerEl)
            .setName("Show setup guidance notifications")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.notification)
					.onChange(async (value) => {
						this.plugin.settings.notification = value;
						await this.plugin.saveSettings();
                        this.plugin.showNotReadyNotice();
					});
			});
	}
}