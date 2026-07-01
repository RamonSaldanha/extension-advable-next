import { defineConfig } from 'wxt';
import { fileURLToPath } from 'url';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'Advable - Escritório inteligente',
    version: '2.13.1',
    icons: {
      '16': 'icon16.png',
      '48': 'icon48.png',
      '128': 'icon128.png',
    },
    permissions: ['tabs', 'scripting', 'activeTab', 'storage'],
    // Restrito ao que a extensão realmente acessa: WhatsApp Web, tribunais
    // (todos os *.jus.br) e o host da API do Advable (+ localhost p/ dev).
    host_permissions: [
      'https://web.whatsapp.com/*',
      '*://*.jus.br/*',
      'https://www.advable.com.br/*',
      'http://127.0.0.1:8000/*',
      'http://localhost:8000/*',
    ],
    web_accessible_resources: [
      {
        resources: ['popup.html', 'assets/*', '*.js', '*.mjs', '*.css', '*.png'],
        matches: ['<all_urls>'],
      },
    ],
    action: {
      default_title: 'Advable Extension',
    },
  },
  vite: () => ({
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
        },
      },
    },
    optimizeDeps: {
      exclude: ['vue-demi'],
    },
  }),
});
