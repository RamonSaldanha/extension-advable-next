<!-- src/components/Login.vue -->
<template>
  <div class="" id="adbl-popup">
    <div class="d-flex justify-content-center">
      <div class="vh-100 w-100">
        <div class="card border-0">
          <div class="card-header">
            <h3>Login</h3>
          </div>
          <div class="card-body">
            <form @submit.prevent="handleLogin">
              <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input
                  type="email"
                  v-model="email"
                  class="form-control"
                  id="email"
                  required
                  placeholder="Digite seu email"
                >
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Senha</label>
                <input
                  type="password"
                  v-model="password"
                  class="form-control"
                  id="password"
                  required
                  placeholder="Digite sua senha"
                >
              </div>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Entrar
              </button>
            </form>
            <div class="mt-3">
              <p>
                Não tem uma conta? <a :href="registerLink">Cadastre-se</a>
              </p>
              <p>
                Esqueceu sua senha? <a :href="forgotPasswordLink">Recupere aqui</a>
              </p>
            </div>
            <div v-if="error" class="alert alert-danger mt-3">
              {{ error }}
            </div>
          </div>
        </div>
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
/* Estilos adicionais se necessário */
.container {
  margin-top: 20px;
}
</style>
