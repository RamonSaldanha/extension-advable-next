import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from '@/router';
import { vMaska } from 'maska/vue';
import money from 'v-money';

import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
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

// Restaurar a rota ao iniciar a aplicação
const lastRoute = localStorage.getItem('lastRoute');
if (lastRoute) {
  router.replace(lastRoute);
}

// Salvar a rota atual após cada navegação
router.afterEach((to) => {
  localStorage.setItem('lastRoute', to.fullPath);
});
