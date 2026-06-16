<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="container">
      <Loader v-if="loading" />

      <div class="d-flex justify-content-between align-items-center my-3">
        <div class="fs-5 fw-semibold mb-0">Clientes</div>
        <button class="btn btn-dark btn-sm" @click="toggleCreate">
          <i class="bi" :class="creating ? 'bi-x-lg' : 'bi-plus-lg'"></i>
          {{ creating ? 'Cancelar' : 'Novo cliente' }}
        </button>
      </div>

      <!-- Cadastro do zero (sem precisar de chat ativo) -->
      <Card v-if="creating" title="Cadastrar nova pessoa" class="mb-3">
        <template #body>
          <div class="mb-2">
            <label class="fw-bold mb-1">Nome</label>
            <input class="form-control form-control-sm" type="text" v-model="newPerson.name" />
          </div>
          <div class="mb-2">
            <label class="fw-bold mb-1">WhatsApp</label>
            <input
              class="form-control form-control-sm"
              type="text"
              v-maska="'(##) #####-####'"
              placeholder="(84) 98732-9303 — estrangeiro: +DDI..."
              v-model="newPerson.whatsapp"
            />
          </div>
          <div class="mb-2">
            <label class="fw-bold mb-1">Email</label>
            <input class="form-control form-control-sm" type="email" v-model="newPerson.email" />
          </div>

          <details class="mt-2">
            <summary class="fw-bold">Documentos</summary>
            <div class="mt-2">
              <div class="mb-2">
                <label class="fw-bold mb-1">CPF</label>
                <input class="form-control form-control-sm" type="text" v-maska="'###.###.###-##'" v-model="newPerson.cpf" />
              </div>
              <div class="mb-2">
                <label class="fw-bold mb-1">CNPJ</label>
                <input class="form-control form-control-sm" type="text" v-maska="'##.###.###/####-##'" v-model="newPerson.cnpj" />
              </div>
            </div>
          </details>

          <button class="btn btn-primary mt-3" :disabled="saving" @click="savePerson">Salvar</button>
        </template>
      </Card>

      <!-- Busca / listagem -->
      <Card title="Buscar clientes">
        <template #body>
          <input
            class="form-control form-control-sm mb-3"
            type="text"
            placeholder="Buscar por nome"
            v-model="query"
          />

          <ul class="list-group list-group-flush" v-if="people.length">
            <li
              v-for="p in people"
              :key="p.id"
              class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div>
                <div class="fw-semibold">{{ p.name }}</div>
                <div class="small text-muted">
                  <i class="bi bi-whatsapp"></i> {{ p.whatsapp || 'sem WhatsApp' }}
                </div>
              </div>
              <router-link :to="`/people/edit/${p.id}`" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-pencil-square"></i> Abrir
              </router-link>
            </li>
          </ul>
          <div v-else class="text-muted small">Nenhum cliente para mostrar.</div>
        </template>
      </Card>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import Card from '@/components/Card.vue';
import Loader from '@/components/Loader.vue';
import Swal from 'sweetalert2';
import debounce from 'lodash.debounce';
import { searchPeople, addPeople } from '@/api/people';

const loading = ref(false);
const saving = ref(false);
const creating = ref(false);
const query = ref('');
const people = ref([]);

const newPerson = ref({ name: '', whatsapp: '', email: '', cpf: '', cnpj: '' });

const load = async (name = '') => {
  loading.value = true;
  try {
    people.value = await searchPeople(name);
  } catch (error) {
    people.value = [];
    console.error('Erro ao buscar clientes:', error);
  } finally {
    loading.value = false;
  }
};

const debouncedLoad = debounce((q) => load(q), 400);
watch(query, (q) => debouncedLoad(q));

const toggleCreate = () => {
  creating.value = !creating.value;
};

const savePerson = async () => {
  if (!newPerson.value.name) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Informe o nome', showConfirmButton: false, timer: 2500 });
    return;
  }
  saving.value = true;
  try {
    await addPeople(newPerson.value);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente cadastrado', showConfirmButton: false, timer: 2500, timerProgressBar: true });
    newPerson.value = { name: '', whatsapp: '', email: '', cpf: '', cnpj: '' };
    creating.value = false;
    await load(query.value);
  } catch (error) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erro ao cadastrar', showConfirmButton: false, timer: 3000 });
    console.error('Erro ao salvar pessoa:', error);
  } finally {
    saving.value = false;
  }
};

onMounted(() => load());
</script>

<style scoped></style>
