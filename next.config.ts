import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Keep your React Compiler optimization active
  reactCompiler: true,

  // 2. Add the shader file string loader
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: "asset/source", // Tells Next.js to read these files as raw text strings
    });
    return config;
  },
};

export default nextConfig;