import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // muss zum tsconfig-Alias passen: @/* -> ./*
    alias: { "@": root },
  },
  test: {
    environment: "node",
    include: [
      "golden/**/*.{test,spec}.ts",
      "lib/**/*.{test,spec}.ts",
      "tests/**/*.{test,spec}.ts",
    ],
  },
});
