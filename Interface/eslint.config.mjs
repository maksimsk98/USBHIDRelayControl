import globals from "globals";

import path from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import pluginJs from "@eslint/js";
import unusedImports from "eslint-plugin-unused-imports";

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({baseDirectory: __dirname, recommendedConfig: pluginJs.configs.recommended});

export default [
  ...compat.extends("airbnb"),
  {languageOptions: { 
    globals: globals.browser,
    ecmaVersion: "latest",
    sourceType: "module",
  }},
  {
    // REQUIRED for FlatConfig blocks to apply to source files
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],

    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "linebreak-style": "off",
      "import/no-named-as-default": "warn",
      "import/no-named-as-default-member": "warn",

      // dev rules
      "no-console": "off",
      "import/prefer-default-export": "off",

      // auto-remove unused imports
      "unused-imports/no-unused-imports": "error",

      // disable core rule
      "no-unused-vars": "off",

      // unused vars = warnings, but NOT auto-fixed
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
];