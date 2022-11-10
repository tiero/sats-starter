/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  //basePath: '/sats-starter',
  reactStrictMode: false,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    config.experiments.asyncWebAssembly = true;
    return config;
  },
}

module.exports = nextConfig
