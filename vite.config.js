import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
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
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `[name].[ext]`,
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: resolve(__dirname, 'src/manifest.json'), dest: '.' },
        { src: resolve(__dirname, 'src/assets'), dest: '.' },
        { src: resolve(__dirname, 'src/popup/popup.js'), dest: 'popup/' },
        { src: resolve(__dirname, 'src/lib/xlsx.full.min.js'), dest: 'lib/' },
      ],
    }),
  ]
}); 