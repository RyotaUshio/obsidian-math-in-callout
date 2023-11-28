import { MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MathInCalloutPluginSettings, MathInCalloutSettingTab } from './settings';
import { createCalloutDecorator } from 'decorations';
import { quoteInfoField } from 'quote-field';
import { patchDecoration } from 'patch-widget-type';

/**
 * TODO: 
 *   - Reduce render() call in callouts
 */

export default class MathInCalloutPlugin extends Plugin {
	settings: MathInCalloutPluginSettings;
	patched: boolean;

	async onload() {
		this.patched = false;

		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new MathInCalloutSettingTab(this));

		this.registerEditorExtension(quoteInfoField);
		patchDecoration(this, (builtInMathWidget) => {
			if (this.settings.callout) {
				// Wait for the view update to finish
				setTimeout(() => {
					this.registerEditorExtension(createCalloutDecorator(this, builtInMathWidget));
					this.rerender()
				}, 100);
			}
		});
		this.app.workspace.onLayoutReady(() => {
			if (!this.patched) {
				new Notice(`${this.manifest.name}: You're not ready yet. In Live Preview, type some math expression outside callouts.`, 10000);
			}
		})
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	rerender() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const editor = leaf.view.editor;
				editor.setValue(editor.getValue());
			} else if (leaf.view.getViewType() === 'canvas') {
				for (const node of (leaf.view as any).canvas.nodes.values()) {
					node.setText(node.text);
				}
			}
		});
	}
}
