const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    // Vendored third-party bundles and generated output.
    ignores: ["dist/**", "node_modules/**", "src/shared/jsewts.js", "src/shared/ewts-converter.js"]
  },
  js.configs.recommended,
  {
    // Extension scripts load as classic scripts and share globalThis.TibetanExtension.
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        TibetanConverter: "readonly"
      }
    }
  },
  {
    files: ["tools/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }]
    }
  }
];
