import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import packageJson from './package.json';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['sheetjs'],
      input: {
        background: 'src/background.js',
        content: 'src/content.ts',
        popup: 'src/popup/popup.html',
        sidebar: 'src/sidebar/sidebar.html'
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
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/manifest.json', dest: '.' },
        { src: 'src/assets/*', dest: 'assets' },
        { src: 'src/lib/xlsx.full.min.js', dest: 'lib/' },
      ],
    }),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
}); 