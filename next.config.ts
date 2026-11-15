import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard output so the app can also run on a VPS (PRD §8, option 2).
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
