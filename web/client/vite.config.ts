import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api-docs": {
        target: "http://localhost:8200",
        changeOrigin: true,
      },
    },
    port: 3000,
    host: "0.0.0.0",
    open: true,
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  },
});
