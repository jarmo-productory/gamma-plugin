import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import packageJson from './package.json';

// Build target can be set via BUILD_TARGET env var
const buildTarget = process.env.BUILD_TARGET || 'extension';

const extensionConfig = {
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['sheetjs'],
      input: {
        background: 'packages/extension/background.js',
        content: 'packages/extension/content.ts',
        'popup/popup': 'packages/extension/popup/popup.js',
        'sidebar/sidebar': 'packages/extension/sidebar/sidebar.js',
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: ({ name }) => {
          if (name.endsWith('.css')) {
            return '[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'packages/extension/manifest.json', dest: '.' },
        { src: 'packages/extension/assets/*', dest: 'assets' },
        { src: 'packages/extension/lib/xlsx.full.min.js', dest: 'lib/' },
        { src: 'packages/extension/popup/popup.html', dest: '.' },
        { src: 'packages/extension/sidebar/sidebar.html', dest: '.' },
        { src: 'packages/extension/sidebar/sidebar.css', dest: '.' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared'),
      '@extension': resolve(__dirname, 'packages/extension'),
    },
  },
};

const webConfig = {
  root: 'packages/web',
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'packages/web/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared'),
      '@web': resolve(__dirname, 'packages/web'),
    },
  },
};

const sharedConfig = {
  build: {
    outDir: 'dist-shared',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'packages/shared/index.ts'),
      name: 'SharedComponents',
      fileName: 'shared',
    },
  },
};

// Select configuration based on build target
const configs = {
  extension: extensionConfig,
  web: webConfig,
  shared: sharedConfig,
};

export default defineConfig(({ mode }) => {
  // Load env file based on mode (e.g. 'development', 'production')
  const env = loadEnv(mode, process.cwd(), '');

  const selectedConfig = configs[buildTarget];

  return {
    ...selectedConfig,
    server: {
      https: {
        key: './certs/key.pem',
        cert: './certs/cert.pem',
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __BUILD_TARGET__: JSON.stringify(buildTarget),
      'process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': JSON.stringify(
        env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      ),
      __HAS_CLERK_KEY__: JSON.stringify(Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)),
    },
  };
});
