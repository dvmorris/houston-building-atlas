/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  base:
    process.env.VITE_BASE_PATH ||
    process.env.BASE_PATH ||
    (process.env.NODE_ENV === "production" ? "/houston-building-atlas/" : "/"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ["maplibre-gl", "pmtiles"],
        },
      },
    },
  },
});
