import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: ["node_modules/**", ".next/**", "test/**"],
        },
      },
      // React components, rendered in jsdom (PLAN.md §11 "Component").
      {
        extends: true,
        test: {
          name: "components",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["test/setup/dom.ts"],
        },
      },
      // Tests that need Postgres (PLAN.md §11). They share the Neon `test` branch, so
      // files run one at a time; otherwise one file's reset would wipe another's data.
      {
        extends: true,
        test: {
          name: "db",
          include: ["test/**/*.test.ts"],
          fileParallelism: false,
          globalSetup: ["test/setup/globalSetup.ts"],
          setupFiles: ["test/setup/env.ts", "test/setup/db.ts"],
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
