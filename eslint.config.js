import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-unnecessary-condition": "error",
      // Allow bracket notation for process.env access (TypeScript doesn't know env var names)
      "@typescript-eslint/dot-notation": [
        "error",
        {
          allowIndexSignaturePropertyAccess: true,
        },
      ],
    },
  },
  // Test file specific rules
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Allow empty functions in mocks
      "@typescript-eslint/no-empty-function": "off",
      // Allow unsafe member access in tests (e.g., mock.calls)
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.config.js"],
  }
);
