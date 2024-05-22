import { defineConfig } from "npm:vite@^5.2.0";
import { resolve } from "node:path";
import dts from "npm:vite-plugin-dts@^3.9.1";

// https://vitejs.dev/config/
export default defineConfig({
  build: { lib: { entry: resolve(__dirname, "src/main.ts"), formats: ["es"] } },
  resolve: { alias: { src: resolve("src/") } },
  plugins: [dts()],
});
