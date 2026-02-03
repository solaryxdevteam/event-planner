import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...(Array.isArray(prettierConfig) ? prettierConfig : [prettierConfig]),
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
      // Relax strictness on explicit `any` types: keep them visible as warnings,
      // but do not fail lint so existing legacy code and tests can pass.
      "@typescript-eslint/no-explicit-any": "warn",
      // Suppress React Compiler warnings about React Hook Form compatibility
      // These are informational warnings about library compatibility and don't affect functionality
      "react-hooks/incompatible-library": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
