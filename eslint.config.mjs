import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    {
        ignores: ["**/node_modules/", "**/main.js"],
    }, ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ),
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "module",
        },

        rules: {
            // Rules from the Obsidian sample plugin
            "@typescript-eslint/ban-ts-comment": "off",
            "no-prototype-builtins": "off",
            "@typescript-eslint/no-empty-function": "off",

            // Semicolons
            semi: ["error", "always"],
            "semi-spacing": ["error", {
                after: true,
                before: false,
            }],
            "semi-style": ["error", "last"],
            "no-extra-semi": "error",
            "no-unexpected-multiline": "error",
            "no-unreachable": "error",

            // Other rules
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_"
                }
            ],

            "@typescript-eslint/no-inferrable-types": ["error", {
                ignoreParameters: true,
                ignoreProperties: true,
            }],

            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-expressions": ["error", {
                allowShortCircuit: true,
                allowTernary: true,
            }],

            "no-console": ["error", { allow: ["warn", "error", "debug"] }],

            // Paied with tsconfig.json's verbatimModuleSyntax
            '@typescript-eslint/consistent-type-imports': ['error', {
                prefer: 'type-imports',
                fixStyle: 'separate-type-imports',
                disallowTypeAnnotations: false,
            }],
        },
    }
];
