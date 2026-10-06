import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "app"),
  "@shared": path.resolve(__dirname, "shared"),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    env: {
      VITEST: "true",
      ATLEITA_TEST_MODE: "1",
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "node",
          include: [
            "api/**/*.test.ts",
            "api/**/*.integration.test.ts",
            "tests/unit/**/*.spec.ts",
            "tests/smoke/**/*.spec.ts",
            "app/**/*.spec.ts",
          ],
          environment: "node",
          setupFiles: ["tests/setup.ts"],
          // TiDB under parallel integration load is often >5s/request.
          testTimeout: 20_000,
          hookTimeout: 90_000,
          fileParallelism: true,
          maxWorkers: 2,
          pool: "forks",
          sequence: { groupOrder: 0 },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "jsdom",
          include: [
            "tests/**/*.spec.tsx",
            "tests/integration/**/*.spec.tsx",
            "app/**/*.spec.tsx",
          ],
          environment: "jsdom",
          setupFiles: ["app/test/setup.ts"],
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
