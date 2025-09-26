import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: "/BobinaVisor/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "logo.png",
      ],
      manifest: {
        name: "BobinaVisor",
        short_name: "BobinaVisor",
        description: "App para revisar el estado de las bobinas",
        start_url: "/BobinaVisor/",
        scope: "/BobinaVisor/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    // Vite expects this limit in KB, so 5 MB = 5120 KB
    chunkSizeWarningLimit: 8 * 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-recharts": ["recharts"],
          "vendor-danfo": ["danfojs"],
        },
      },
    },
  },
});
