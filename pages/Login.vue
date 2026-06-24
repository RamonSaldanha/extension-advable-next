<!-- src/components/Login.vue -->
<template>
  <div id="adbl-popup" class="login-screen">
    <div class="login-card">
      <div class="login-brand">
        <img :src="logo" alt="Advable" class="login-logo" />
        <span class="login-wordmark">Advable</span>
      </div>

      <h1 class="ad-display login-title">Bem-vindo de volta</h1>
      <p class="login-sub">Entre para acessar seu escritório.</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="adbl-field">
          <label class="adbl-label" for="email">Email</label>
          <input
            id="email"
            type="email"
            v-model="email"
            class="adbl-input"
            required
            placeholder="seu@email.com"
          />
        </div>
        <div class="adbl-field">
          <label class="adbl-label" for="password">Senha</label>
          <input
            id="password"
            type="password"
            v-model="password"
            class="adbl-input"
            required
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          class="adbl-btn adbl-btn--primary adbl-btn--block login-submit"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          Entrar
        </button>
      </form>

      <div v-if="error" class="login-error">{{ error }}</div>

      <div class="login-links">
        <p>Não tem uma conta? <a :href="registerLink">Cadastre-se</a></p>
        <p>Esqueceu sua senha? <a :href="forgotPasswordLink">Recupere aqui</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

// Variáveis reativas
const email = ref('') // Inicialize vazio ou com valores padrão
const password = ref('')
const error = ref('')
// Logo da extensão (icon48.png fica na raiz do pacote — URL confiável em qualquer contexto)
const logo =
  typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL
    ? browser.runtime.getURL('/icon48.png')
    : ''

// Instâncias necessárias
const auth = useAuthStore()
const router = useRouter()

const registerLink = computed(() => `${import.meta.env.VITE_APP_BASE_URL}register`);
const forgotPasswordLink = computed(() => `${import.meta.env.VITE_APP_BASE_URL}forgot-password`);

// Computed property para o estado de loading
const loading = computed(() => auth.loading)

// Função para lidar com o login
const handleLogin = async () => {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    console.error('Erro no login:', err)
    if (err.response && err.response.data && err.response.data.message) {
      error.value = err.response.data.message
    } else {
      error.value = 'Falha na autenticação. Verifique suas credenciais.'
    }
  }
}
</script>

<style scoped>
.login-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fff;
  padding: 24px 20px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 340px;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 22px;
}

.login-logo {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.login-wordmark {
  font-family: var(--ad-font-display, 'Fraunces Variable', serif);
  font-optical-sizing: auto;
  font-weight: 600;
  font-size: 24px;
  letter-spacing: -0.01em;
  color: var(--ad-navy, #16223f);
}

.login-title {
  font-size: 24px;
  margin: 0 0 4px;
}

.login-sub {
  margin: 0 0 22px;
  font-size: 14px;
  color: var(--ad-muted, #8b93a3);
}

.login-form {
  margin-bottom: 6px;
}

.login-submit {
  margin-top: 6px;
  padding-top: 11px;
  padding-bottom: 11px;
  font-size: 14px;
}

.login-submit .spinner-border {
  margin-right: 6px;
}

.login-error {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--ad-pill-late-bg, #f6dadb);
  color: var(--ad-pill-late-fg, #a23a44);
  font-size: 13px;
  font-weight: 500;
}

.login-links {
  margin-top: 22px;
  border-top: 1px solid var(--ad-line, #e6e8ee);
  padding-top: 16px;
}

.login-links p {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--ad-text, #3f4757);
}

.login-links a {
  color: var(--ad-navy, #16223f);
  font-weight: 600;
  text-decoration: none;
}

.login-links a:hover {
  text-decoration: underline;
}
</style>
