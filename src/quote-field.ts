import { editorEditorField } from 'obsidian';
import { syntaxTree } from '@codemirror/language';
import { StateField, Transaction, RangeSet, RangeValue, RangeSetBuilder } from '@codemirror/state';

const BLOCKQUOTE = /HyperMD-quote_HyperMD-quote-(?<level>[1-9][0-9]*)/;

export class QuoteInfo extends RangeValue {
    pattern: RegExp | null;

    constructor(
        public level: number,
        public isCallout: boolean
    ) {
        super();
        this.pattern = this.level > 0 ? new RegExp(`^( {0,3}>){${this.level}}`) : null;
    }

    eq(other: QuoteInfo) {
        return this.level === other.level && this.isCallout === other.isCallout
    }

    correctMath(math: string): string {
        if (!this.pattern) return math;

        const lines = math.split("\n");
        return lines
            .map((line) => {
                const match = line.match(this.pattern!);
                return match ? line.slice(match[0].length) : line;
            }).join("\n");
    }
}

export const quoteInfoField = StateField.define<RangeSet<QuoteInfo>>({
    create() {
        return RangeSet.empty;
    },
    update(prev: RangeSet<QuoteInfo>, tr: Transaction) {
        const view = tr.state.field(editorEditorField);
        const state = tr.state;
        const tree = syntaxTree(state);
        const builder = new RangeSetBuilder<QuoteInfo>();

        let level = 0;
        let from = -1;
        const isCalloutStack: boolean[] = [];

        tree.iterate({
            enter(node) {
                if (!node.node.parent) return;

                if (node.node.parent?.name === "Document") {
                    const match = node.name.match(BLOCKQUOTE);
                    const newLevel = match ? +match.groups!.level : 0;

                    if (newLevel !== level) {
                        if (level > 0 && from >= 0) {
                            const isCallout = (newLevel > level ? isCalloutStack.last() : isCalloutStack.pop()) ?? false;
                            builder.add(from, node.from, new QuoteInfo(level, isCallout));
                        }

                        if (newLevel > level) {
                            isCalloutStack.push(node.name.contains("HyperMD-callout"));
                        }

                        // start off a new quote
                        from = node.from;
                        level = newLevel;
                    }
                }

                return false;
            }
        });

        if (level > 0 && from >= 0) {
            const isCallout = isCalloutStack.pop() ?? false;
            builder.add(from, state.doc.length, new QuoteInfo(level, isCallout));
        }

        return builder.finish();
    }
});
