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
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 10 MiB
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 5 * 1024 * 1024,
  },
  manifest: {
    name: "BobinaVisor",
    short_name: "BobinaVisor",
    start_url: "/",
    description: "App para revisar el estado de las bobinas",
    theme_color: "#000000ff",
    includeAssets: [
      "public/favicon.svg",
      "public/favicon.ico",
      "public/apple-touch-icon.png",
    ],

    icons: [
      { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
});
