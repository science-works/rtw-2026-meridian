import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // The second reporter keeps web/src/generated/test-count.json equal to the real passing count.
    reporters: ["default", "./tests/test-count-reporter.ts"],
  },
});
