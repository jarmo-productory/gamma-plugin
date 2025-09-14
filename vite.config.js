import { defineConfig } from 'vite'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ mode }) => {
  const buildTarget = process.env.BUILD_TARGET || 'web'
  const buildEnv = process.env.BUILD_ENV || 'development'
  
  // Base configuration shared by all targets
  const baseConfig = {
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'packages/shared'),
        '@extension': resolve(__dirname, 'packages/extension'),
        '@web': resolve(__dirname, 'packages/web'),
      },
    },
    define: {
      'process.env.BUILD_TARGET': JSON.stringify(buildTarget),
      'process.env.BUILD_ENV': JSON.stringify(process.env.BUILD_ENV || 'development'),
      '__BUILD_ENV__': JSON.stringify(process.env.BUILD_ENV || 'development'),
    }
  }

  // Chrome Extension specific configuration
  if (buildTarget === 'extension') {
    return {
      ...baseConfig,
      build: {
        outDir: 'packages/extension/dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            content: resolve(__dirname, 'packages/extension/content.ts'),
            background: resolve(__dirname, 'packages/extension/background.js'),
            popup: resolve(__dirname, 'packages/extension/popup/popup.js'),
            sidebar: resolve(__dirname, 'packages/extension/sidebar/sidebar.js'),
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name]-[hash].js',
            assetFileNames: '[name].[ext]'
          }
        },
        lib: false // We don't want library mode for extensions
      },
      plugins: [
        viteStaticCopy({
          targets: [
            // Copy manifest and static assets - select based on build environment
            {
              src: buildEnv === 'production' 
                ? 'packages/extension/manifest.production.json' 
                : 'packages/extension/manifest.json',
              dest: '.',
              rename: 'manifest.json'
            },
            {
              src: 'packages/extension/assets/*',
              dest: 'assets'
            },
            {
              src: 'packages/extension/lib/*',
              dest: 'lib'
            },
            // Copy HTML files
            {
              src: 'packages/extension/sidebar/sidebar.html',
              dest: '.',
              rename: 'sidebar.html'
            },
            {
              src: 'packages/extension/popup/popup.html',
              dest: '.',
              rename: 'popup.html'
            },
            // Copy CSS files
            {
              src: 'packages/extension/sidebar/sidebar.css',
              dest: '.',
              rename: 'sidebar.css'
            }
          ]
        })
      ]
    }
  }

  // Shared library configuration
  if (buildTarget === 'shared') {
    return {
      ...baseConfig,
      root: 'packages/shared',
      build: {
        outDir: '../../dist-shared',
        emptyOutDir: true,
        lib: {
          entry: resolve(__dirname, 'packages/shared/index.ts'),
          name: 'GammaShared',
          formats: ['es', 'cjs']
        }
      }
    }
  }

  // Default fallback (shouldn't happen with explicit BUILD_TARGET)
  throw new Error(`Unknown BUILD_TARGET: ${buildTarget}. Supported values: extension, shared`)
})
