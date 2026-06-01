// vite.config.spa.ts — Build SPA estático para deploy na Vercel.
// Usa Vite puro (sem TanStack Start SSR / Cloudflare Workers).
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
    ],
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    build: {
      outDir: "dist-spa",
      emptyOutDir: true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              // React ecosystem MUST stay together
              if (
                /node_modules\/(react|react-dom|scheduler|react-is|use-sync-external-store)\//.test(id)
              ) {
                return "vendor-react";
              }

              // TanStack
              if (id.includes("@tanstack")) {
                return "vendor-tanstack";
              }

              // Supabase
              if (id.includes("@supabase")) {
                return "vendor-supabase";
              }

              // Charts
              if (id.includes("recharts")) {
                return "vendor-charts";
              }

              // Icons
              if (id.includes("lucide-react")) {
                return "vendor-lucide";
              }

              // Radix
              if (id.includes("@radix-ui")) {
                return "vendor-radix";
              }

              // fallback
              return "vendor-misc";
            }
          },
        },
      },
    },
  };
});
