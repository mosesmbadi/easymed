import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The project writes JSX in .js files.
  esbuild: { loader: "jsx", include: /(src|tests)[\\/].*\.js$/, exclude: [], jsx: "automatic" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // The app logs a lot. Only show it for a test that failed.
    silent: "passed-only",
    include: ["tests/unit/**/*.test.js"],
    setupFiles: ["tests/unit/setup.js"],
    server: { deps: { inline: ["devextreme", "devextreme-react"] } },
  },
});
