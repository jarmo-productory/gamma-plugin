import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/content.js'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        sidebar: resolve(__dirname, 'src/sidebar/sidebar.html')
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: resolve(__dirname, 'src/manifest.json'), dest: '.' },
        { src: resolve(__dirname, 'src/assets'), dest: '.' },
        { src: resolve(__dirname, 'src/popup/popup.js'), dest: 'popup' }
      ]
    })
  ]
}); 