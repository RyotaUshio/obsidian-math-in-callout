import { syntaxTree } from '@codemirror/language';
import { StateField, Transaction, RangeSet, RangeValue, RangeSetBuilder, EditorState } from '@codemirror/state';
import { printRangeSet } from 'utils';

/**
 * A range value that represents a blockquote or a callout. 
 */
export class QuoteInfo extends RangeValue {
    pattern: RegExp | null;

    /**
     * @param level The level of the blockquote/callout (i.e. the number of ">"s).
     * @param isBaseCallout True if this is a callout or this is on top of a callout of level 1.
     */
    constructor(
        public level: number,
        public isBaseCallout: boolean
    ) {
        super();
        this.pattern = this.level > 0 ? new RegExp(`^( {0,3}>){${this.level}}`) : null;
    }

    eq(other: QuoteInfo) {
        return this.level === other.level && this.isBaseCallout === other.isBaseCallout
    }

    /** Remove ">"s that is misrecognized as inequality signs. */
    correctMath(math: string): string {
        if (!this.pattern) return math;

        const lines = math.split("\n");
        return lines
            .map((line) => {
                const match = line.match(this.pattern!);
                return match ? line.slice(match[0].length) : line;
            }).join("\n");
    }

    getBlockquoteBorderPositions(state: EditorState, from: number, to: number) {
        const positions: { pos: number, first: boolean }[] = [];

        const lineBegin = state.doc.lineAt(from);
        const lineEnd = state.doc.lineAt(to);

        for (let i = lineBegin.number; i <= lineEnd.number; i++) {
            const line = state.doc.line(i);
            let start = 0;
            for (let i = 0; i < this.level; i++) {
                const index = line.text.indexOf('>', start);
                if (index === -1) continue;

                positions.push({ pos: index + line.from, first: i === 0 });
                start = index + 1;
            }
        }
        return positions;
    }
}

export const quoteInfoField = StateField.define<RangeSet<QuoteInfo>>({
    create(state: EditorState) {
        return parseBlockquotes(state);
    },
    update(prev: RangeSet<QuoteInfo>, tr: Transaction) {
        return parseBlockquotes(tr.state);
    }
});


function parseBlockquotes(state: EditorState) {
    const tree = syntaxTree(state);
    const builder = new RangeSetBuilder<QuoteInfo>();

    let level = 0;
    let from = -1;
    let isBaseCallout = false;

    for (let i = 1; i <= state.doc.lines; i++) {
        const line = state.doc.line(i);
        const match = line.text.match(/^( {0,3}>)+/);
        const newLevel = match ? match[0].split('>').length - 1 : 0;

        if (newLevel !== level) {
            if (level === 0 && newLevel === 1) {
                isBaseCallout = tree.cursorAt(line.from, 1).node.name.contains("-callout");
            }

            if (level > 0 && from >= 0) {
                builder.add(from, line.from, new QuoteInfo(level, isBaseCallout));
            }

            level = newLevel;
            from = line.from;
        }
    }

    if (level > 0 && from >= 0) {
        builder.add(from, state.doc.length, new QuoteInfo(level, isBaseCallout));
    }

    return builder.finish();

    // printRangeSet(ret, (from, to, value) => {
    //     const lineBegin = state.doc.lineAt(from);
    //     const lineEnd = state.doc.lineAt(to);
    //     return `${from}-${to} [${lineBegin.number}, ${lineEnd.number - 1}]: level=${value.level} isBaseCallout=${value.isBaseCallout}`;
    // });
}
