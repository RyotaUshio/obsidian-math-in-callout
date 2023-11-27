import { SelectionRange, RangeSetBuilder, StateField, Transaction, Extension } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { quoteInfoField } from 'quote-field';
import { editorEditorField, editorLivePreviewField } from 'obsidian';


function hasOverlap(range: SelectionRange, start: number, to: number) {
    return range.from <= to && range.to >= start
}

function rangesHaveOverlap(ranges: readonly SelectionRange[], start: number, to: number) {
    for (const range of ranges) {
        if (hasOverlap(range, start, to))
            return true;
    }
    return false;
}

export const createCalloutDecorator = (BuiltInMathWidget: new (math: string, block: boolean) => WidgetType) => StateField.define<DecorationSet>({
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
            const builder = new RangeSetBuilder<Decoration>();

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

                            const widget = new BuiltInMathWidget(math, block);
                            // @ts-ignore
                            widget.setPos(block && math.startsWith("\n") ? mathContentBegin + 1 : mathContentBegin, block && math.endsWith("\n") ? mathContentEnd - 1 : mathContentEnd);

                            const field = state.field(quoteInfoField, false);
                            const quote = field?.iter((widget as any).start).value;
                            if (quote?.isCallout === false) return;


                            if (rangesHaveOverlap(ranges, mathBegin, mathEnd)) {
                                if (block) {
                                    builder.add(mathEnd, mathEnd, Decoration.widget({
                                        widget,
                                        block: false,
                                        side: 1
                                    }));
                                }
                            } else {
                                builder.add(mathBegin, mathEnd, makeDeco({
                                    widget,
                                    block: false,
                                    side: 1
                                }, mathBegin, mathEnd));
                                mathBegin = -1;
                                mathContentBegin = -1;
                            }
                        }
                    }
                }
            });
            return builder.finish();
        },
        provide(field: StateField<DecorationSet>): Extension{
            return EditorView.decorations.from(field);
        },
    }
);

