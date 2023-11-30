import { MarkdownView, Notice, Plugin } from 'obsidian';
import { createCalloutDecorator } from 'decorations';
import { quoteInfoField } from 'quote-field';
import { patchDecoration } from 'patch-widget-type';

export default class MathInCalloutPlugin extends Plugin {
	patchSucceeded: boolean;

	async onload() {
		this.patchSucceeded = false;

		this.registerEditorExtension(quoteInfoField);

		// Wait for a second to avoid showing the "You're not ready yet" notification when it's not necessary
		let notReadyNotice: Notice;
		this.app.workspace.onLayoutReady(() => setTimeout(() => {
			if (!this.patchSucceeded) {
				notReadyNotice = new Notice(`${this.manifest.name}: You're not ready yet. In Live Preview, type some math expression outside callouts.`, 0);
			}
		}, 1000));

		patchDecoration(this, (builtInMathWidget) => {
			// Wait for the view update to finish
			setTimeout(() => {
				if (notReadyNotice) notReadyNotice.hide();
				new Notice(`${this.manifest.name}: You're ready!`, 1500);
				this.registerEditorExtension(createCalloutDecorator(this, builtInMathWidget));
				this.rerender()
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
}
