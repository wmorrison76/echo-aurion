/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
  ],
  plugins: ["react", "react-hooks"],
  settings: { react: { version: "detect" } },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "no-undef": "error",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
  },
  ignorePatterns: ["dist/", "build/", "node_modules/"],
};
