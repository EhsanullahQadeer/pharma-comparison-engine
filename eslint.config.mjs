import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// AGENTS.md Code Rule 15 - navigation must go through the route-progress
// wrappers, never next/link or next/navigation directly.
const navigationRestrictedPaths = [
  {
    name: "next/link",
    message:
      "Import Link from '@/components/Link' instead - it triggers the route-progress bar (AGENTS.md Code Rule 15).",
  },
  {
    name: "next/navigation",
    importNames: ["useRouter"],
    message:
      "Import useRouter from '@/hooks/useRouter' instead - it triggers the route-progress bar (AGENTS.md Code Rule 15).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // --- Console usage ---
      "no-console": ["error", { allow: ["warn", "error"] }],

      // --- Import organization ---
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "object",
            "type",
          ],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // --- Type safety / dead code ---
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-unreachable": "error",
      "no-unused-expressions": "error",
      "react-hooks/exhaustive-deps": "error",

      // --- Conditional rendering ---
      "no-nested-ternary": "error",
      "react/jsx-no-leaked-render": [
        "error",
        { validStrategies: ["ternary", "coerce"] },
      ],

      // --- File size ---
      "max-lines": [
        "warn",
        { max: 600, skipBlankLines: true, skipComments: true },
      ],

      // --- Destructive-action confirms ---
      "no-restricted-globals": [
        "error",
        {
          name: "confirm",
          message:
            "Use confirm() from '@/lib/confirm-store' instead of window.confirm (AGENTS.md UI Rule 7).",
        },
        {
          name: "alert",
          message: "Use the app's toast/dialog system instead of window.alert.",
        },
        {
          name: "prompt",
          message: "Use a proper form/dialog instead of window.prompt.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "confirm",
          message:
            "Use confirm() from '@/lib/confirm-store' instead of window.confirm (AGENTS.md UI Rule 7).",
        },
        {
          object: "window",
          property: "alert",
          message: "Use the app's toast/dialog system instead of window.alert.",
        },
        {
          object: "window",
          property: "prompt",
          message: "Use a proper form/dialog instead of window.prompt.",
        },
      ],

      // --- Navigation ---
      "no-restricted-imports": [
        "error",
        { paths: navigationRestrictedPaths },
      ],
    },
  },

  // Prisma client access belongs in server actions, not pages/components.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/Link.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...navigationRestrictedPaths,
            {
              name: "@/lib/prisma",
              message:
                "Don't query Prisma directly from pages/components - add or extend a server action under src/actions/** (AGENTS.md Code Rule 2).",
            },
          ],
        },
      ],
    },
  },

  // New code should use the shared common wrappers around UI primitives.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/common/**", "src/components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/components/ui/*"],
              message:
                "Wrap shadcn primitives in @/components/common instead of importing @/components/ui/* directly (AGENTS.md UI Rule 8).",
            },
          ],
        },
      ],
    },
  },

  // Domain types belong in src/types/<domain>.ts, not colocated types.ts files.
  {
    files: [
      "src/components/**/types.ts",
      "src/actions/**/types.ts",
      "src/hooks/**/types.ts",
      "src/lib/**/types.ts",
    ],
    ignores: ["src/types/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message:
            "Domain types belong in src/types/<domain>.ts, not a colocated types.ts (AGENTS.md Code Rule 7).",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "_scratch_*.js",
    "prisma/seed*.ts",
    "prisma/verify*.ts",
    ".claude/worktrees/**",
    // Utility scripts (console.log expected) and temp/browser profiles:
    "scripts/**",
    "tmp/**",
  ]),
]);

export default eslintConfig;
