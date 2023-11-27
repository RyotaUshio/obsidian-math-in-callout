import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MathInCalloutPluginSettings, MathInCalloutSettingTab } from './settings';
import { createCalloutDecorator } from 'decorations';
import { quoteInfoField } from 'quote-field';
import { patchWidgetType } from 'patch-widget-type';


export default class MathInCalloutPlugin extends Plugin {
	settings: MathInCalloutPluginSettings;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new MathInCalloutSettingTab(this));

		this.registerEditorExtension(quoteInfoField);
		patchWidgetType(this, (builtInMathWidget) => {
			if (this.settings.callout) {
				this.registerEditorExtension(createCalloutDecorator(builtInMathWidget));
				this.rerender();
			}
		});
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
