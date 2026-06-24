import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from '@/router';
import { vMaska } from 'maska/vue';
import money from 'v-money';

import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
// Fontes da marca (empacotadas; funcionam offline, sem CDN/CSP)
import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import './style.scss';

// Detecta se estamos dentro de um iframe (offcanvas) para ajustar dimensões
if (window !== window.top) {
  document.documentElement.classList.add('in-iframe');
}

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App).directive('maska', vMaska);

app.use(pinia);
app.use(router);
app.use(money, { precision: 4 });
app.mount('#app');

// Espelha um token já persistido (sessão existente) para o background, para que
// o lookup do cluster de ícones funcione sem exigir novo login.
try {
  const existingToken = localStorage.getItem('token');
  if (existingToken && typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    browser.storage.local.set({ token: existingToken });
  }
} catch (e) {
  /* storage indisponível */
}

// Restaurar a última rota só quando NÃO houver deep-link explícito no hash
// (ex.: o cluster abre o iframe direto em #/person/note/...). Assim a rota
// passada pelo ícone é respeitada em vez de sobrescrita pela última visitada.
const currentHash = window.location.hash || '';
const hasDeepLink = currentHash !== '' && currentHash !== '#/' && currentHash !== '#';
const lastRoute = localStorage.getItem('lastRoute');
if (lastRoute && !hasDeepLink) {
  router.replace(lastRoute);
}

// Salvar a rota atual após cada navegação
router.afterEach((to) => {
  localStorage.setItem('lastRoute', to.fullPath);
});
