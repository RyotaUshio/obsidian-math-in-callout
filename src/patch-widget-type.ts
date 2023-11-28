import { Decoration } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { WidgetType } from '@codemirror/view';
import { around } from "monkey-around";

import MathInCalloutPlugin from 'main';
import { QuoteInfo, quoteInfoField } from 'quote-field';

// constructor of Obsidian's built-in math widget
type BuiltInMathWidgetConstructor = new (math: string, block: boolean) => BuiltInMathWidget;

interface BuiltInMathWidget extends WidgetType {
    math: string;
    block: boolean;
    start: number;
    // the followings are added by this plugin
    getQuoteInfo(view?: EditorView): QuoteInfo | null;
    correctIfNecessary(view?: EditorView): void;
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
            }
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
            }
        }
    });
    plugin.register(uninstaller);
}


function patchMathWidget(plugin: MathInCalloutPlugin, widget: WidgetType): boolean {
    const proto = widget.constructor.prototype;
    const isObsidianBuiltinMathWidget = Object.hasOwn(widget, 'math') && Object.hasOwn(widget, 'block') && Object.hasOwn(proto, 'initDOM') && Object.hasOwn(proto, 'render') && !Object.hasOwn(proto, 'toDOM');
    if (isObsidianBuiltinMathWidget) {
        plugin.register(around(proto, {
            getQuoteInfo() {
                return function (view?: EditorView): QuoteInfo | null {
                    view = this.view ?? view;
                    if (view) {
                        const field = view.state.field(quoteInfoField, false);
                        const quote = field?.iter(this.start).value;
                        return quote ?? null;
                    }
                    return null
                }
            },
            markAsCorrected() {
                return function () {
                    this.corrected = true;
                }
            },
            correctIfNecessary() {
                return function (view?: EditorView) {
                    if (this.block && !this.corrected) {
                        const quote = this.getQuoteInfo(view);
                        if (quote) {
                            this.math = quote.correctMath(this.math);
                            this.markAsCorrected();
                        }
                    }
                }
            },
            eq(old) {
                return function (other: BuiltInMathWidget): boolean {
                    // TODO: Can we further reduce the chance of unnecessary re-rendering of multi-line math blocks in blockquotes?
                    if (this.block && other.block) {
                        if (!this.corrected) this.correctIfNecessary(this.view ?? other.view);
                        if (!other.corrected) other.correctIfNecessary(other.view ?? this.view);
                    }
                    return old.call(this, other);
                }
            },
            initDOM(old) {
                return function (view: EditorView) {
                    if (!this.view) this.view = view;
                    return old.call(this, view);
                }
            },
            patchDOM(old) {
                return function (dom: HTMLElement, view: EditorView) {
                    if (!this.view) this.view = view;
                    return old.call(this, dom, view);
                }
            },
            render(old) {
                return function (dom: HTMLElement) {
                    this.correctIfNecessary();
                    old.call(this, dom);
                }
            }
        }));
        return true;
    }

    return false;
}
