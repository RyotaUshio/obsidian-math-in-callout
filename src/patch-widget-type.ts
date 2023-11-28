import { Decoration } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { WidgetType } from '@codemirror/view';
import { around } from "monkey-around";

import MathInCalloutPlugin from 'main';
import { quoteInfoField } from 'quote-field';
import { Notice } from 'obsidian';

// constructor of Obsidian's built-in math widget
type BuiltInMathWidgetConstructor = new (math: string, block: boolean) => WidgetType;

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
                if (!plugin.patched && spec.widget) {
                    // const proto = spec.widget.constructor.prototype;
                    // const isObsidianBuiltinMathWidget = Object.hasOwn(spec.widget, 'math') && Object.hasOwn(spec.widget, 'block') && Object.hasOwn(proto, 'initDOM') && Object.hasOwn(proto, 'render') && !Object.hasOwn(proto, 'toDOM');
                    // if (isObsidianBuiltinMathWidget) {
                    //     plugin.register(around(proto, {
                    //         initDOM(old) {
                    //             return function (view: EditorView) {
                    //                 if (!this.view) this.view = view;
                    //                 return old.call(this, view);
                    //             }
                    //         },
                    //         patchDOM(old) {
                    //             return function (dom: HTMLElement, view: EditorView) {
                    //                 if (!this.view) this.view = view;
                    //                 return old.call(this, dom, view);
                    //             }
                    //         },
                    //         render(old) {
                    //             return function (dom: HTMLElement) {
                    //                 if (plugin.settings.multiLine && this.block && this.view) {
                    //                     const field = (this.view as EditorView).state.field(quoteInfoField, false);
                    //                     const quote = field?.iter(this.start).value;
                    //                     this.math = quote?.correctMath(this.math) ?? this.math;
                    //                 }
                    //                 old.call(this, dom);
                    //             }
                    //         }
                    //     }));
                    const sucess = patchMathWidget(plugin, spec.widget);
                    if (sucess) {
                        plugin.patched = true;
                        new Notice(`${plugin.manifest.name}: You're ready!`);
                        onPatched(spec.widget.constructor as BuiltInMathWidgetConstructor);
                        uninstaller(); // uninstall the patcher for Decoration as soon as possible
                    }
                }
                return old.call(this, spec);
            }
        },
        widget(old) {
            return function (spec: { widget?: WidgetType }) {
                if (!plugin.patched && spec.widget) {
                    const sucess = patchMathWidget(plugin, spec.widget);
                    if (sucess) {
                        plugin.patched = true;
                        new Notice(`${plugin.manifest.name}: You're ready!`);
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
        return true;
    }

    return false;
}