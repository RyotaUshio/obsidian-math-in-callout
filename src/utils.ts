import { SelectionRange, RangeSet, RangeValue, EditorState } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';

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

export function rangeSetHas<T extends RangeValue>(e: RangeSet<T>, target: T, from: number, to: number) {
    let found = false;
    e.between(from, to, (start, end, value) => {
        if (value === target) {
            found = true;
            return false;
        }
    });
    return found;
}

// Debugging utility
export function printNode(node: SyntaxNodeRef, state: EditorState) {
    console.log(
        `${node.from}-${node.to}: "${state.sliceDoc(node.from, node.to)}" (${node.name})`
    );
}

