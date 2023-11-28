import { SelectionRange, RangeSet, RangeValue, EditorState } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import { QuoteInfo, quoteInfoField } from 'quote-field';

/** Get a quote info for the given position. */
export function getQuoteInfo(state: EditorState, pos: number): QuoteInfo | null {
    const field = state.field(quoteInfoField, false);
    if (!field) return null;

    const { from, to, value } = field.iter(pos);
    if (from <= pos && pos <= to) return value

    return null;
}

export function hasOverlap(range: SelectionRange, start: number, to: number) {
    return range.from <= to && range.to >= start
}

export function rangesHaveOverlap(ranges: readonly SelectionRange[], start: number, to: number) {
    for (const range of ranges) {
        if (hasOverlap(range, start, to))
            return true;
    }
    return false;
}

/////////////////////////
// Debugging utilities //
/////////////////////////

export function printNode(node: SyntaxNodeRef, state: EditorState) {
    console.log(
        `${node.from}-${node.to}: "${state.sliceDoc(node.from, node.to)}" (${node.name})`
    );
}

export function printRangeSet<T extends RangeValue>(set: RangeSet<T>, format?: (from: number, to: number, value: T) => any | any[]) {
    set.between(0, Infinity, (from, to, value) => {
        if (format) {
            const message = format(from, to, value)
            if (Array.isArray(message)) console.log(...message);
            else console.log(message);
        } else {
            console.log(`${from}-${to}:`, value);
        }
    });
}
