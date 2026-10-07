import { defineConfig } from "vitest/config";

// Unit tests for the app live next to the code; Playwright owns e2e/.
export default defineConfig({
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"], exclude: ["e2e/**", "node_modules/**"], passWithNoTests: true },
});
