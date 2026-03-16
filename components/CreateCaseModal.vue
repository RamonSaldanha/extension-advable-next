<template>
  <div class="modal fade" id="createCaseModal" tabindex="-1" aria-labelledby="createCaseModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="createCaseModalLabel">Criar Nova Negociação</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="mt-3">
            <label class="fw-bold mb-2">Título*</label>
            <input 
              v-model="title" 
              type="text" 
              class="form-control form-control-sm" 
              placeholder="Título para o caso" 
            />
          </div>
          <div class="mt-3">
            <label class="fw-bold mb-2">Funil*</label>
            <select 
              v-model="stateId" 
              class="form-select form-select-sm"
            >
              <option disabled selected value="">Selecione uma coluna</option>
              <option 
                v-for="state in states" 
                :key="state.id" 
                :value="state.id"
              >
                {{ state.name }}
              </option>
            </select>
          </div>
          <div class="mt-3 d-flex align-items-center">
            <div class="me-2">Qualificação:</div>
            <div class="rating">
              <span 
                v-for="star in 5" 
                :key="star"
                @click="updateRating(star)"
                class="rating-star"
                :class="{ 'text-warning': star <= rating }"
              >
                <i class="bi fs-6" :class="star <= rating ? 'bi-star-fill' : 'bi-star'"></i>
              </span>
            </div>
          </div>
          <div class="mt-3">
            <input 
              v-model="price" 
              type="text"
              class="form-control form-control-sm"
              placeholder="Valor do caso" 
              v-money="money"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Fechar</button>
          <button 
            type="button" 
            class="btn btn-dark btn-sm"
            @click="handleCreateCase"
          >
            <i class='bx bxs-plus-circle'></i>
            Adicionar Caso
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Swal from 'sweetalert2';
import { addCase } from '@/api/people';
import * as bootstrap from 'bootstrap';

const props = defineProps({
  states: {
    type: Array,
    required: true
  },
  chatId: {
    type: String,
    required: true
  },
  personId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['case-created']);

const title = ref('');
const rating = ref(0);
const stateId = ref('');
const price = ref('');

const money = {
  decimal: ',',
  thousands: '.',
  precision: 2,
  masked: false
};

const updateRating = (value) => {
  rating.value = value;
};

const handleCreateCase = async () => {
  try {
    const newCase = {
      title: title.value,
      rating: rating.value,
      state_id: stateId.value,
      price: price.value,
      external_chat_id: props.chatId,
      person_id: props.personId
    };

    const response = await addCase(newCase);
    if (response.success) {
      emit('case-created', response.case);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Caso adicionado com sucesso',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

      // Reset form
      title.value = '';
      rating.value = 0;
      stateId.value = '';
      price.value = '';

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('createCaseModal'));
      modal.hide();
    } else {
      throw new Error('Erro ao adicionar caso: resposta inválida da API');
    }
  } catch (error) {
    console.error('Erro ao adicionar caso:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: error.message || 'Ocorreu um erro ao tentar adicionar o caso'
    });
  }
};
</script>

<style scoped>
.rating {
  display: inline-flex;
  cursor: pointer;
}

.rating-star {
  padding: 0 2px;
}

.rating-star:hover {
  transform: scale(1.1);
}
</style>
