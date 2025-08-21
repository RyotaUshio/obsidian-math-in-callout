import { MarkdownView, Notice, Plugin } from 'obsidian';
import { createCalloutDecorator } from 'decorations';
import { quoteInfoField } from 'quote-field';
import { patchDecoration } from 'patch-widget-type';
import type { MathInCalloutSettings } from 'settings';
import { DEFAULT_SETTINGS, MathInCalloutSettingTab } from 'settings';

export default class MathInCalloutPlugin extends Plugin {
	patchSucceeded: boolean;
	notReadyNotice: Notice | null = null;
	settings: MathInCalloutSettings;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new MathInCalloutSettingTab(this));

		this.patchSucceeded = false;

		this.registerEditorExtension(quoteInfoField);

		// Wait for a second to avoid showing the "You're not ready yet" notification when it's not necessary
		this.app.workspace.onLayoutReady(() => setTimeout(() => this.showNotReadyNotice(), 1000));

		patchDecoration(this, (builtInMathWidget) => {
			// Wait for the view update to finish
			setTimeout(() => {
				if (this.notReadyNotice) {
					this.notReadyNotice.hide();
					this.notReadyNotice = null;
					if (this.settings.notification) {
						new Notice(`${this.manifest.name}: You're ready! (Note: this notifiction can be turned off in the plugin setting.)`, 1500);
					}
				}
				this.registerEditorExtension(createCalloutDecorator(builtInMathWidget));
				this.rerender();
			}, 100);
		});
	}

	rerender() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const eState = leaf.view.getEphemeralState();
				const editor = leaf.view.editor;
				editor.setValue(editor.getValue());
				leaf.view.setEphemeralState(eState);
			}
		});
	}

	showNotReadyNotice() {
		if (!this.patchSucceeded && this.settings.notification) {
			this.notReadyNotice = new Notice(`${this.manifest.name}: You're not ready yet. In Live Preview, type some math expression outside callouts.`, 0);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
