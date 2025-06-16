import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  worker: {
    format: "es",
  },
  preview: {
    port: 4173, // or your preferred port
    host: true, // allow external access
    allowedHosts: [
      "staging-canvas.testthelink.online",
      "canvas.testthelink.online",
    ], // allow specific hosts
  },
});
