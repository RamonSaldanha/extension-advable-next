import { defineStore } from 'pinia';
import api from '@/api/axios';
import router from '@/router';

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
