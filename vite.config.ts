import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        gallery: 'index.html',
        galaxy: 'galaxy-duel/index.html',
        triangle: 'triangle-duel/index.html',
        constellations: 'constellations/index.html',
      },
    },
  },
});
