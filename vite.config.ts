import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8081,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Connection", "keep-alive");
          });
        },
      },
      "/business": { target: "http://localhost:8000", changeOrigin: true, secure: false },
      "/public":   { target: "http://localhost:8000", changeOrigin: true, secure: false },
      "/uploads":  { target: "http://localhost:8000", changeOrigin: true, secure: false },
      "/storage":  { target: "http://localhost:8000", changeOrigin: true, secure: false },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Raise the inline threshold so small assets are inlined instead of extra requests
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        // Vendor chunk splits: large libs load in parallel and can be cached independently
        manualChunks: {
          "vendor-react":     ["react", "react-dom", "react-router-dom"],
          "vendor-ui":        ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-toast"],
          "vendor-charts":    ["recharts"],
          "vendor-tanstack":  ["@tanstack/react-query"],
        },
      },
    },
    // Minify CSS alongside JS in one pass
    cssMinify: true,
    // Faster source map for prod builds (or disable for smallest bundles)
    sourcemap: false,
  },
  // Pre-bundle more dependencies so the browser gets fewer round-trips on first load
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "recharts",
      "@tanstack/react-query",
    ],
  },
}));
