import { defineConfig } from "npm:vitest@^1.6.0/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
