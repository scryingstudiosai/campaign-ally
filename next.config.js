/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Already type-checked during build
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  swcMinify: true,
  experimental: {
    serverActions: true,
  },
  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Reduce build output
  outputFileTracing: true,
  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // Optimize for deployment
  generateBuildId: async () => {
    return 'campaign-ally-build';
  },
  // Smaller output
  compress: true,
  // Suppress Supabase webpack warnings
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase/ },
      /Critical dependency: the request of a dependency is an expression/,
    ];
    return config;
  },
};

module.exports = nextConfig;
