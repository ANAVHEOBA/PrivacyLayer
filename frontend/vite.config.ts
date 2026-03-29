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
  publicDir: "public",
  build: {
    target: "esnext",
    sourcemap: true,
    // Enable rollup chunking for better caching and smaller initial bundle
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "zustand"],
          freighter: ["@stellar/freighter-api"],
        },
      },
    },
    // Minification is handled by esbuild by default
    // Emit warning for large chunks
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 3000,
    open: true,
  },
  // Enable gzip compression via compression plugin in production
  // For now, configure optimizeDeps for faster dev server starts
  optimizeDeps: {
    include: ["react", "react-dom", "zustand", "@stellar/freighter-api"],
  },
});
