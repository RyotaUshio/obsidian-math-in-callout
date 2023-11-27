import { EditorView } from '@codemirror/view';
import { WidgetType } from '@codemirror/view';
import { around } from "monkey-around";

import MathBooster from "main";
import { quoteInfoField } from 'quote-field';

type BuiltInMathWidgetConstructor = new (math: string, block: boolean) => WidgetType;

export const patchWidgetType = (plugin: MathBooster, onPatched: (builtInMathWidget: BuiltInMathWidgetConstructor) => void) => {
    const { app } = plugin;
    let patched = false;

    plugin.register(around(WidgetType.prototype, {
        // @ts-ignore
        compare(old) {
            return function (other: WidgetType): boolean {
                if (!patched) {
                    const proto = Object.getPrototypeOf(this);
                    const isObsidianBuiltinMathWidget = Object.hasOwn(this, 'math') && Object.hasOwn(this, 'block') && Object.hasOwn(proto, 'initDOM') && Object.hasOwn(proto, 'render') && !Object.hasOwn(proto, 'toDOM');
                    if (isObsidianBuiltinMathWidget) {
                        plugin.register(around(proto, {
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
                                    if (plugin.settings.multiLine && this.block && this.view) {
                                        const field = (this.view as EditorView).state.field(quoteInfoField, false);
                                        const quote = field?.iter(this.start).value;
                                        this.math = quote?.correctMath(this.math) ?? this.math;
                                    }
                                    old.call(this, dom);
                                }
                            }
                        }));
                        patched = true;
                        // Wait for the view update to finish
                        setTimeout(() => onPatched(this.constructor), 100);
                    }
                }
                return old.call(this, other);
            }
        }
    }));
}