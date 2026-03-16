<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="container">
      <Loader v-if="loading" />
      <div class="d-flex justify-content-between align-items-center">
        <button 
          class="btn btn-sm btn-outline-secondary my-3" 
          @click="handleBack"
        >
          <i class="bi bi-arrow-left-short"></i>
          Voltar
        </button>
        <div class="fw-semibold fs-6 text-muted">
          {{ caso?.title }}
        </div>
      </div>

      <div class="row gx-3">
        <!-- Coluna principal -->
        <div class="col-md-8">
          <Card title="Informações do Caso" class="mb-3">
            <template #body>
              <div class="mb-3">
                <label for="title" class="form-label fw-semibold">Título</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="caso.title"
                />
              </div>

              <div class="mb-3">
                <label for="state" class="form-label fw-semibold">Estado</label>
                <select
                  class="form-select form-select-sm"
                  v-model="caso.state_id"
                  @change="saveCase"
                >
                  <option value="" disabled selected>Selecione um estado</option>
                  <option 
                    v-for="state in states" 
                    :key="state.id" 
                    :value="state.id"
                  >
                    {{ state.name }}
                  </option>
                </select>
              </div>

              <div class="mb-3 d-flex">
                <div class="me-2 fw-semibold">
                  Qualificação:
                </div>
                <div class="rating">
                  <span 
                    v-for="star in 5" 
                    :key="star"
                    @click="updateRating(star)"
                    class="rating-star"
                    :class="{ 'text-warning': star <= (caso.rating || 0) }"
                  >
                    <i 
                      class="bi" 
                      :class="star <= (caso.rating || 0) ? 'bi-star-fill' : 'bi-star'"
                    ></i>
                  </span>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Descrição</label>
                <textarea
                  class="form-control form-control-sm"
                  v-model="caso.description"
                  placeholder="Faça uma descrição desse caso"
                  rows="4"
                ></textarea>
              </div>

              <div class="mb-3">
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  @click="deleteCase(caso.uuid)"
                >
                  <i class="bi bi-trash"></i>
                  Deletar caso
                </button>
              </div>
            </template>
          </Card>
        </div>

        <!-- Coluna lateral -->
        <div class="col-md-4">

          <!-- Negociação -->
          <Card title="Negociação" icon="bi-cash-coin">
            <template #body>
              <div class="mb-3">
                <label class="form-label fw-semibold">Valor</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-money="money"
                  v-model="caso.price"
                />
              </div>
              <div class="d-flex gap-2">
                <button 
                  class="btn btn-success btn-sm" 
                  @click="toggleStatus('Venda')"
                  :disabled="caso.status === 'Venda'"
                >
                  <i class="bi bi-check-circle"></i> Marcar como venda
                </button>

                <button 
                  class="btn btn-danger btn-sm"
                  @click="toggleStatus('Perda')"
                  :disabled="caso.status === 'Perda'"
                >
                  <i class="bi bi-x-circle"></i> Marcar como perda
                </button>

                <button 
                  class="btn btn-warning btn-sm text-white"
                  @click="toggleStatus('Pendente')"
                  :disabled="caso.status === 'Pendente'"
                >
                  <i class="bi bi-clock"></i> Marcar como pendente
                </button>
              </div>


              <div class="mt-2" v-if="caso.status !== 'Pendente'">
                <span :class="{
                  'text-success': caso.status === 'Venda',
                  'text-danger': caso.status === 'Perda'
                }">
                  Status: {{ caso.status }} em {{ formatDate(caso.status_date) }}
                </span>
              </div>

              <div class="mt-3" v-if="caso.status === 'Perda'">
                <label class="form-label fw-semibold">Motivo da perda</label>
                <select
                  class="form-select form-select-sm"
                  v-model="caso.loss_reason"
                  @change="saveCase"
                >
                  <option value="" disabled selected>Selecione um motivo</option>
                  <option v-for="reason in lossReasons" :key="reason" :value="reason">
                    {{ reason }}
                  </option>
                </select>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/Layout.vue'
import DefaultHeader from '@/components/DefaultHeader.vue'
import Loader from '@/components/Loader.vue'
import { getCaseByUuid, updateCase, getAllStates, deleteCaseByUuid } from '@/api/people'
import Swal from 'sweetalert2'
import Card from '@/components/Card.vue'
import moment from 'moment';
import 'moment/locale/pt-br';
import debounce from 'lodash.debounce';

const isInitialLoad = ref(true)

moment.locale('pt-br');

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const caso = ref({})
const lossReasons = ref([
  'Desistiu do caso',
  'Não recebeu resposta hábil',
  'Fechou com outro escritório',
  'Não gostou do serviço',
  'Não tem mais interesse',
  'Parou de responder',
  'Inviabilidade jurídica',
  'Outro'
])
const states = ref([])

const formatDate = (date) => {
  return moment(date).format('DD/MM/YYYY [às] HH:mm');
};

const formatDateToMysql = (date) => {
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ')
}

const money = {
  decimal: ',',
  thousands: '.',
  // prefix: 'R$ ',
  // suffix: ' #',
  precision: 2,
  masked: false /* doesn't work with directive */
};

const handleBack = () => {
  router.go(-1)
}


const fetchStates = async () => {
  loading.value = true;
  try {
    const response = await getAllStates();
    states.value = response;
  } catch (error) {
    showError('Erro ao buscar estados');
    console.error('Erro ao buscar estados:', error);
  } finally {
    loading.value = false;
  }
};

const fetchCase = async () => {
  loading.value = true
  try {
    const response = await getCaseByUuid(route.params.uuid)
    caso.value = response
    
    // Adicionar watchers após o carregamento inicial
    setTimeout(() => {
      isInitialLoad.value = false
    }, 1000)
    
  } catch (error) {
    console.error('Erro ao buscar caso:', error)
    showError('Erro ao buscar caso')
  } finally {
    loading.value = false
  }
}

// Watchers individuais
watch(() => caso.value.title, (newVal, oldVal) => {
  if (!isInitialLoad.value && newVal !== oldVal) {
    debouncedSave()
  }
}, { deep: true })

watch(() => caso.value.description, (newVal, oldVal) => {
  if (!isInitialLoad.value && newVal !== oldVal) {
    debouncedSave()
  }
}, { deep: true })

watch(() => caso.value.price, (newVal, oldVal) => {
  if (!isInitialLoad.value && newVal !== oldVal) {
    debouncedSave()
  }
}, { deep: true })

const updateRating = (rating) => {
  caso.value.rating = rating
  saveCase()
}

const toggleStatus = async (status) => {
  caso.value.status = status
  caso.value.status_date = formatDateToMysql(new Date())
  await saveCase()
}

const formatPriceToApi = (price) => {
  if (!price) return null;
  return parseFloat(price.toString().replace(/\./g, '').replace(',', '.')).toFixed(2);
}

const saveCase = async () => {
  loading.value = true
  try {
    const casoToSave = { ...caso.value }
    // Formata data
    if (casoToSave.status_date) {
      casoToSave.status_date = formatDateToMysql(casoToSave.status_date)
    }
    // Formata preço
    if (casoToSave.price) {
      casoToSave.price = formatPriceToApi(casoToSave.price)
    }
    
    await updateCase(casoToSave.uuid, casoToSave)
    showSuccess('Caso atualizado com sucesso')
  } catch (error) {
    console.error('Erro ao atualizar caso:', error)
    showError('Erro ao atualizar caso')
  } finally {
    loading.value = false
  }
}

const deleteCase = async (uuid) => {
  const result = await Swal.fire({
    title: 'Tem certeza?',
    text: 'Essa ação não pode ser desfeita!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, deletar!',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    try {
      // Chamar API para deletar caso
      deleteCaseByUuid(uuid);
      await Swal.fire('Deletado!', 'O caso foi deletado.', 'success')
      handleBack()
    } catch (error) {
      showError('Erro ao deletar caso')
    }
  }
}


const showSuccess = (message) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 3000
  })
}

const showError = (message) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title: message,
    showConfirmButton: false,
    timer: 3000
  })
}

onMounted(() => {
  fetchCase();
  fetchStates();
})

// Debounced save function
const debouncedSave = debounce(async () => {
  if (!isInitialLoad.value) {
    await saveCase()
  }
}, 800)
</script>

<style scoped>
.rating-star {
  cursor: pointer;
  transition: color 0.2s;
}

.rating-star:hover {
  color: #ffc107;
}
</style>
