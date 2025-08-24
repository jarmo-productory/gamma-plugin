/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration for Gate 5 testing
  reactStrictMode: true,
  
  // Basic performance optimizations
  compress: true,
  
  // Remove complex dependencies for testing
  // No bundle analyzer, no custom webpack config, no complex headers
};

module.exports = nextConfig;