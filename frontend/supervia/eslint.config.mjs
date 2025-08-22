// ESLint flat config (ESLint v9)
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Config Next.js (équivalent de extends: ["next/core-web-vitals", "next/typescript"]) en flat config
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Nos règles de sévérité additionnelles
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "error"
    }
  }
];
