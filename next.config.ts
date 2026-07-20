import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep your React Compiler optimization active
  reactCompiler: true,

  // ⚡ Turbopack Configuration (Fires during 'npm run dev')
  // Uses Turbopack's native "raw" module type to load strings directly
  turbopack: {
    rules: {
      "*.{glsl,vs,fs,vert,frag}": {
        type: "raw",
      },
    },
  },

  // 🛠️ Webpack Configuration (Fires during production builds)
  // Uses Webpack 5's native "asset/source" type to load strings directly
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;