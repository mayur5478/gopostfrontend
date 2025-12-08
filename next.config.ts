import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to support dynamic routes with server-side rendering
  // Netlify will automatically handle Next.js deployment with their adapter
  distDir: 'dist',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  generateBuildId: async () => {
    return 'build-' + Date.now()
  }
};

export default nextConfig;
