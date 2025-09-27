/** @type {import('next').NextConfig} */

// CI/Production environment validation
function validateProductionEnvironment() {
  // Only run validation in CI/Netlify contexts, not local development
  const isCI = process.env.CI === 'true' || process.env.NETLIFY === 'true'
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (!isCI || !isProduction) {
    return // Skip validation for local development
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Validate APP_URL doesn't contain localhost
  if (appUrl && appUrl.includes('localhost')) {
    throw new Error(
      `❌ CI Guardrail: NEXT_PUBLIC_APP_URL contains 'localhost' in production: ${appUrl}\n` +
      `   This would cause OAuth redirects to fail in production.\n` +
      `   Expected: https://productory-powerups.netlify.app`
    )
  }
  
  // Validate Supabase key is publishable format
  if (anonKey && !anonKey.startsWith('sb_publishable_')) {
    throw new Error(
      `❌ CI Guardrail: NEXT_PUBLIC_SUPABASE_ANON_KEY is not in publishable format\n` +
      `   Current format: ${anonKey.substring(0, 20)}...\n` +
      `   Expected format: sb_publishable_...`
    )
  }
  
  console.log('✅ CI Guardrails: Production environment validation passed')
}

// Run validation before build
validateProductionEnvironment()

const nextConfig = {
  reactStrictMode: true,
  compress: true,

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,

  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Output optimization - removed standalone for Netlify compatibility

  // Cache optimization
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production-only optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 200000, // Target <200KB chunks per Sprint 35
          cacheGroups: {
            // High priority chunks for critical libraries
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
              enforce: true,
            },
            // XLSX library - dynamic import only (not in main bundle)
            xlsx: {
              test: /[\\/]node_modules[\\/]xlsx[\\/]/,
              name: 'xlsx',
              chunks: 'async', // Only loaded when dynamically imported
              priority: 30,
              enforce: true,
            },
            // UI library chunks
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 25,
              minChunks: 1,
            },
            lucide: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'lucide-icons',
              chunks: 'all',
              priority: 25,
            },
            // Backend/database chunks
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 20,
            },
            // General vendor chunk with size limits
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              maxSize: 200000, // 200KB max per chunk
              minChunks: 1,
            },
          },
        },
      }
    }

    return config
  },

  eslint: {
    // Allow production builds to complete with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete with TypeScript errors temporarily
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;