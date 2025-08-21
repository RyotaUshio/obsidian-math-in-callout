import { Decoration } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { WidgetType } from '@codemirror/view';
import { around } from "monkey-around";

import type MathInCalloutPlugin from 'main';
import type { QuoteInfo } from 'quote-field';
import { getQuoteInfo } from 'utils';

// constructor of Obsidian's built-in math widget
export type BuiltInMathWidgetConstructor = new (math: string, block: boolean) => BuiltInMathWidget;

interface BuiltInMathWidget extends WidgetType {
    math: string;
    block: boolean;
    start: number;
    setPos: (start: number, end: number) => void;
    // the followings are added by this plugin
    getQuoteInfo(): QuoteInfo | null;
    correctIfNecessary(): void;
    markAsCorrected(): void;
    corrected?: boolean;
    view?: EditorView;
}

/**
 * Monkey-patch the built-in math widget to add a better support for multi-line math in blockquotes.
 * But the class itself is not directly accesible, so we first patch Decoration.replace and Decoration.widget,
 * and then access the widget class from the argument passed to them.
 * 
 * @param onPatched Callback executed when the built-in math widget is patched.
 */
export const patchDecoration = (
    plugin: MathInCalloutPlugin,
    onPatched: (builtInMathWidget: BuiltInMathWidgetConstructor) => void
) => {
    const uninstaller = around(Decoration, {
        replace(old) {
            return function (spec: { widget?: WidgetType }) {
                if (!plugin.patchSucceeded && spec.widget) {
                    plugin.patchSucceeded = patchMathWidget(plugin, spec.widget);
                    if (plugin.patchSucceeded) {
                        onPatched(spec.widget.constructor as BuiltInMathWidgetConstructor);
                        uninstaller(); // uninstall the patcher for Decoration as soon as possible
                    }
                }
                return old.call(this, spec);
            };
        },
        widget(old) {
            return function (spec: { widget?: WidgetType }) {
                if (!plugin.patchSucceeded && spec.widget) {
                    plugin.patchSucceeded = patchMathWidget(plugin, spec.widget);
                    if (plugin.patchSucceeded) {
                        onPatched(spec.widget.constructor as BuiltInMathWidgetConstructor);
                        uninstaller(); // uninstall the patcher for Decoration as soon as possible
                    }
                }
                return old.call(this, spec);
            };
        }
    });
    plugin.register(uninstaller);
};


function patchMathWidget(plugin: MathInCalloutPlugin, widget: WidgetType): boolean {
    // check if the given widget is the built-in math widget based on its & its prototype's properties
    const proto = widget.constructor.prototype;
    const superProto = Object.getPrototypeOf(proto);
    const superSuperProto = Object.getPrototypeOf(superProto);
    const isObsidianBuiltinMathWidget =
        Object.hasOwn(widget, 'math')
        && Object.hasOwn(widget, 'block')
        && Object.hasOwn(proto, 'eq')
        && Object.hasOwn(proto, 'initDOM')
        && Object.hasOwn(proto, 'patchDOM')
        && Object.hasOwn(proto, 'render')
        && !Object.hasOwn(proto, 'toDOM')
        && !Object.hasOwn(proto, 'updateDOM')
        && Object.hasOwn(superProto, 'become')
        && Object.hasOwn(superProto, 'updateDOM')
        && Object.hasOwn(superSuperProto, 'addEditButton')
        && Object.hasOwn(superSuperProto, 'hookClickHandler')
        && Object.hasOwn(superSuperProto, 'resizeWidget')
        && Object.hasOwn(superSuperProto, 'setOwner')
        && Object.hasOwn(superSuperProto, 'setPos')
        && Object.hasOwn(superSuperProto, 'toDOM')
        && Object.getPrototypeOf(superSuperProto) === WidgetType.prototype;

    if (isObsidianBuiltinMathWidget) {
        plugin.register(around(proto, {
            /** Newly added by this plugin: Get a quote info for the position of this math widget. */
            getQuoteInfo() {
                return function (): QuoteInfo | null {
                    // Here, the magic number "-1" is required to handle the following ill-formed case:
                    // $$
                    // > a
                    // > a $$
                    // In blockquote, this.start is set to the position of the first ">" by the Obsidian's built-in state field.
                    // It causes this equation to be recognized as being in blockquote, but it's not.
                    return this.view ? getQuoteInfo(this.view.state, this.start - 1) : null;
                };
            },
            /** Newly added by this plugin */
            markAsCorrected() {
                return function () {
                    this.corrected = true;
                };
            },
            /** 
             * Newly added by this plugin: Correct the LaTeX source code (this.math)
             * based on the quote info, i.e. remove an appropreate number of ">"s 
             * at the head of each line.
             */
            correctIfNecessary() {
                return function () {
                    if (this.block && !this.corrected) {
                        const quote = this.getQuoteInfo();
                        if (quote) {
                            this.math = quote.correctMath(this.math);
                            this.markAsCorrected();
                        }
                    }
                };
            },
            eq(old) {
                return function (other: BuiltInMathWidget): boolean {
                    if (this.block && other.block) {
                        // Share editor view to make it easy to obtain QuoteInfo and minimize unnecessary re-rendering
                        if (this.view && !other.view) other.view = this.view;
                        if (other.view && !this.view) this.view = other.view;
                        // Correct math before comparing to minimize the chance of unnecessary re-rendering
                        if (!this.corrected) this.correctIfNecessary();
                        if (!other.corrected) other.correctIfNecessary();
                    }
                    return old.call(this, other);
                };
            },
            initDOM(old) {
                return function (view: EditorView) {
                    // Set this.view to make it possible to obtain QuoteInfo and correct this.math
                    if (!this.view) this.view = view;
                    return old.call(this, view);
                };
            },
            patchDOM(old) {
                return function (dom: HTMLElement, view: EditorView) {
                    // Set this.view to make it possible to obtain QuoteInfo and correct this.math
                    if (!this.view) this.view = view;
                    return old.call(this, dom, view);
                };
            },
            render(old) {
                return function (dom: HTMLElement) {
                    // Correct this.math based on the quote level before rendering
                    this.correctIfNecessary();
                    old.call(this, dom);
                };
            }
        }));
        return true;
    }

    return false;
}
