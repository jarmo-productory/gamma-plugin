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
        sidebar: 'src/sidebar/sidebar.js'
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `[name].[ext]`,
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/manifest.json', dest: '.' },
        { src: 'src/assets', dest: '.' },
        { src: 'src/popup/popup.js', dest: 'popup/' },
        { src: 'src/lib/xlsx.full.min.js', dest: 'lib/' },
      ],
    }),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
}); 