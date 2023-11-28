import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, EditorState } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { ViewPlugin } from '@codemirror/view';
import { ViewUpdate, DecorationSet, WidgetType } from '@codemirror/view';
import { rangeSetHas, rangesHaveOverlap } from 'utils';


export class BlockquoteBorderWidget extends WidgetType {
    toDOM() {
        return createSpan({
            cls: "cm-blockquote-border cm-transparent",
            text: ">"
        });
    }
}

export const replaceDeco = Decoration.replace({ widget: new BlockquoteBorderWidget() });
export const markDeco = Decoration.mark({ class: "cm-transparent" })

export const blockquoteBorderViewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = Decoration.none;
    }

    update(update: ViewUpdate) {
        const { state, view } = update;
        const ranges = view.hasFocus ? state.selection.ranges : [];
        const tree = syntaxTree(state);
        const builder = new RangeSetBuilder<Decoration>();

        for (const { from, to } of view.visibleRanges) {
            tree.iterate({
                from,
                to,
                enter(node) {
                    if (node.name.contains("formatting-quote")) {
                        const line = state.doc.lineAt(node.from);
                        if (!rangesHaveOverlap(ranges, line.from, line.to)) {
                            if (node.name.contains("quote-1")) builder.add(node.from, node.from + 1, markDeco);
                            else builder.add(node.from, node.from + 1, replaceDeco);
                        };
                    }
                }
            });
        }

        this.decorations = builder.finish();
    }
}, {
    decorations: v => v.decorations
});
