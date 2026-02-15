/**
 * Vite config for bundle analysis.
 * Usage: npx vite build --config vite.analyze.ts
 *        (aliased as `npm run analyze`)
 *
 * Generates dist/stats.html with a treemap visualizer.
 */
import { defineConfig, mergeConfig } from "vite";
import baseConfigFn from "./vite.config";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig((env) => {
  const base = (baseConfigFn as any)(env);
  return mergeConfig(base, {
    plugins: [
      visualizer({
        filename: "dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
    ],
  });
});
