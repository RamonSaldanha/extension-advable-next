<!-- src/components/ChangeTeamModal.vue -->
<template>
  <div class="modal modal-overlay fade" :class="{ show: isVisible }" id="changeTeamModal" tabindex="-1" aria-labelledby="changeTeamModalLabel" aria-hidden="true" v-if="isVisible">
    <div class="modal-dialog modal-fullscreen modal-dialog-scrollable modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="changeTeamModalLabel">Selecione o time</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="close"></button>
        </div>
        <div class="modal-body">
          
          <div v-if="loading" class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
          </div>
          <div v-else>
            <ul class="list-group">
              
              <li v-for="team in teams" :key="team.id" class="list-group-item d-flex justify-content-between align-items-center">
                <span>{{ team.name }}</span>
                <button 
                  v-if="team.id !== currentTeamId" 
                  class="btn btn-primary btn-sm" 
                  @click="switchTeam(team.id)">
                  Selecionar
                </button>
                <button
                class="btn btn-primary btn-sm"  
                disabled
                v-else >
                  Atual
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="close">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api/axios';
import Swal from 'sweetalert2';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const teams = ref([]);
const loading = ref(false);
const currentTeamId = ref(null);

const close = () => {
  emit('close');
};

// Função para buscar a lista de times
const fetchTeams = async () => {
  loading.value = true;
  try {
    const response = await api.get('/teams');
    teams.value = response.data.teams;
    currentTeamId.value = response.data.current_team_id;
  } catch (error) {
    console.error('Erro ao buscar times:', error);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'Erro',
      text: 'Não foi possível carregar a lista de times.',
    });
  } finally {
    loading.value = false;
  }
};

// Função para mudar o time
const switchTeam = async (teamId) => {
  try {
    await api.post('/teams/switch', { team_id: teamId });
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Sucesso',
      text: 'Time alterado com sucesso.',
    });
    currentTeamId.value = teamId;
    // close();
  } catch (error) {
    console.error('Erro ao mudar de time:', error);
    Swal.fire({
      toast: true,
      icon: 'error',
      position: 'top-end',
      title: 'Erro',
      text: 'Não foi possível mudar de time.',
    });
  }
};

onMounted(() => {
  fetchTeams();
});
</script>
