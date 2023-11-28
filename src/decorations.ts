import { Range, StateField, Transaction, Extension } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { quoteInfoField } from 'quote-field';
import { editorEditorField, editorLivePreviewField } from 'obsidian';
import { rangesHaveOverlap } from 'utils';
import MathInCalloutPlugin from 'main';
import { BuiltInMathWidgetConstructor } from 'patch-widget-type';


/**
 * Creates a state field that provides the following decorations:
 *   - Math expressions in callouts
 *   - Blockquote borders (">"s etc) in blockquotes & callouts
 * 
 * The implementation of this function was deeply inspired by the state field
 * defined in the "QF" function in Obsidian's app.js.
 */
export const createCalloutDecorator = (plugin: MathInCalloutPlugin, BuiltInMathWidget: BuiltInMathWidgetConstructor) => StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },

    update(prev: DecorationSet, tr: Transaction): DecorationSet {
        const { state } = tr;
        const isSourceMode = !state.field(editorLivePreviewField);
        if (isSourceMode) return Decoration.none;

        const view = state.field(editorEditorField);
        const tree = syntaxTree(state);
        const doc = state.doc;
        const ranges = view.hasFocus ? state.selection.ranges : [];
        const decorations: Range<Decoration>[] = [];

        const makeDeco = (decorationSpec: { widget: WidgetType, block?: boolean, inclusiveEnd?: boolean, side?: number }, from: number, to: number) => {
            if (decorationSpec.block && to === doc.length) decorationSpec.inclusiveEnd = false;
            return Decoration.replace(decorationSpec);
        };

        let mathBegin = -1;
        let mathContentBegin = -1;
        let block = false;

        tree.iterate({
            enter(node) {
                if (node.name.contains("formatting-math-begin")) {
                    mathBegin = node.from;
                    mathContentBegin = node.to;
                    block = node.name.contains("math-block");
                } else if (mathBegin !== -1) {
                    if (node.name.contains("formatting-math-end")) {
                        const mathContentEnd = node.from;
                        const mathEnd = node.to;

                        let math = doc.sliceString(mathContentBegin, mathContentEnd);
                        const field = state.field(quoteInfoField, false);
                        const quote = field?.iter(mathContentBegin).value;
                        if (quote) math = quote.correctMath(math);

                        const widget = new BuiltInMathWidget(math, block);
                        if (quote) widget.markAsCorrected();
                        widget.setPos(
                            block && math.startsWith("\n") ? mathContentBegin + 1 : mathContentBegin,
                            block && math.endsWith("\n") ? mathContentEnd - 1 : mathContentEnd
                        );

                        const overlap = rangesHaveOverlap(ranges, mathBegin, mathEnd);

                        if (quote) {
                            if (quote.isBaseCallout || overlap) {

                                const lineBegin = state.doc.lineAt(mathBegin);
                                const lineEnd = state.doc.lineAt(mathEnd);

                                for (let i = lineBegin.number; i <= lineEnd.number; i++) {
                                    const line = state.doc.line(i);

                                    decorations.push(
                                        Decoration.line({ class: "HyperMD-quote" }).range(line.from, line.from)
                                    );

                                    const transparent = !rangesHaveOverlap(ranges, line.from, line.to);
                                    let start = 0;

                                    for (let i = 0; i < quote.level; i++) {
                                        const index = line.text.indexOf('>', start);
                                        if (index === -1) continue;

                                        const pos = index + line.from;
                                        if (i === 0) {
                                            decorations.push(
                                                Decoration.mark({ class: transparent ? "cm-transparent" : "cm-quote cm-formatting-quote" }).range(pos, pos + 1)
                                            );
                                        } else {
                                            decorations.push(
                                                Decoration.mark({ class: transparent ? "cm-blockquote-border cm-transparent" : "cm-quote cm-formatting-quote" }).range(pos, pos + 1)
                                            );
                                        }
                                        start = index + 1;
                                    }
                                }


                                if (lineEnd.text.slice(0, mathContentEnd - lineEnd.from).split('>').every(s => !s.trim())) {
                                    decorations.push(
                                        Decoration.mark({ class: "cancel-cm-math" }).range(lineEnd.from, mathContentEnd)
                                    );
                                }
                            }
                        }

                        if (overlap) {
                            if (block) {
                                if (quote?.isBaseCallout) {
                                    decorations.push(
                                        Decoration.widget({
                                            widget,
                                            block: false,
                                            side: 1
                                        }).range(mathEnd, mathEnd)
                                    );
                                }
                            }
                        } else {
                            if (quote?.isBaseCallout) {
                                decorations.push(
                                    makeDeco({
                                        widget,
                                        block: false,
                                        side: 1
                                    }, mathBegin, mathEnd).range(mathBegin, mathEnd)
                                );
                            }
                        }

                        mathBegin = -1;
                        mathContentBegin = -1;
                    }
                }
            }
        });

        return Decoration.set(decorations, true);
    },

    provide(field: StateField<DecorationSet>): Extension {
        return EditorView.decorations.from(field);
    }
});
