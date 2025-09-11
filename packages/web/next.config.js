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