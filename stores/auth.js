import { defineStore } from 'pinia';
import api from '@/api/axios';
import router from '@/router';

// Espelha o token de login em browser.storage.local para que o background
// service worker (que não enxerga o localStorage do popup) possa fazer o lookup
// autenticado de "esse chat tem cliente?" sem expor o token à página do WhatsApp.
function mirrorTokenToExtensionStorage(token) {
  try {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      if (token) {
        browser.storage.local.set({ token });
      } else {
        browser.storage.local.remove('token');
      }
    }
  } catch (e) {
    /* storage indisponível (ex.: fora da extensão) */
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    user: null,
    loading: false,
  }),
  actions: {
    async login(email, password) {
      this.loading = true;
      try {
        const response = await api.post('/new-login-api', { email, password });
        this.token = response.data.token;
        this.user = response.data.user;
        localStorage.setItem('token', this.token);
        mirrorTokenToExtensionStorage(this.token);
      } catch (error) {
        console.error('Erro no login:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      mirrorTokenToExtensionStorage(null);
      router.push({ name: 'Login' });
    },
    async fetchUser() {
      if (this.token) {
        this.loading = true;
        try {
          const response = await api.get('/user');
          this.user = response.data.user;
          console.log('Usuário atualizado:', this.user);
        } catch (error) {
          console.error('Erro ao buscar usuário:', error);
          this.logout();
        } finally {
          this.loading = false;
        }
      }
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'auth',
        storage: localStorage,
        paths: ['token', 'user'],
      },
    ],
  },
});
