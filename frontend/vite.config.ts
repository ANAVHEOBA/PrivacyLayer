import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
