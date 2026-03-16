<!-- src/components/tribunais/processPagePJEJfrn.vue -->
<template>
  <div>
    <!-- Loader -->
    <Loader v-if="loading" />

    <!-- Mensagem de erro -->
    <div v-if="errorMessage" class="alert alert-warning alert-dismissible fade show" role="alert">
      {{ errorMessage }}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>

    <!-- Processo já cadastrado -->
    <div v-if="processExists">
      <div class="d-flex align-items-center mb-3">
        <i class="bi bi-check-circle-fill text-success me-2"></i>
        <span>Processo já cadastrado</span>
      </div>
      <a :href="processDetailsUrl + process.id" target="_blank" class="adble-ml-1">
        Ver detalhes deste processo
      </a>
    </div>

    <!-- Formulário -->
    <form v-else>
      <!-- Número do processo -->
      <div class="mb-2">
        <strong>Número:</strong> {{ process.number }}
      </div>
      <!-- Jurisdição -->
      <div class="mb-2">
        <strong>Jurisdição:</strong> {{ process.jurisdiction }}
      </div>
      
      <!-- Acordeão para detalhes e partes -->
      <div class="accordion my-4" style="font-size: .9rem;" id="processAccordion">

        <!-- Detalhes do processo -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingDetails">
            <button
              class="accordion-button collapsed"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapseDetails"
              aria-expanded="false"
              aria-controls="collapseDetails"
            >
              Detalhes do processo
            </button>
          </h2>
          <div
            id="collapseDetails"
            class="accordion-collapse collapse"
            aria-labelledby="headingDetails"
            data-bs-parent="#processAccordion"
          >
            <div class="accordion-body">
              <div class="mb-2">
                <strong>Classe judicial:</strong> {{ process.details.classeJudicial }}
              </div>
              <div class="mb-2">
                <strong>Assunto:</strong>
                <ul class="list-unstyled mb-0">
                  <li v-for="(assunto, index) in process.details.assuntos" :key="index">{{ assunto }}</li>
                </ul>
              </div>
              <div class="mb-2">
                <strong>Data de autuação:</strong> {{ process.details.autuacao }}
              </div>
              <div class="mb-2">
                <strong>Órgão julgador:</strong> {{ process.jurisdiction }}
              </div>
              <div class="mb-2">
                <strong>Valor da causa:</strong> {{ process.details.valorDaCausa }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-check form-switch mb-3">
        <input 
          class="form-check-input"
          type="checkbox"
          id="filterClients"
          v-model="showOnlyMyClients"
        >
        <label class="form-check-label" for="filterClients">
          Mostrar apenas meus clientes
        </label>
      </div>

      <Card title="Partes do processo" icon="bi-person-fill">
        <template #listGroup>
          <!-- Lista de pessoas -->
          <ul class="list-group list-group-flush pb-1">
            <li 
              class="list-group-item d-flex justify-content-between align-items-center" 
              v-for="(parte, index) in filteredPeople" 
              :key="index"
            >
              <div class="d-flex align-items-center">
                <div>
                  <strong>{{ parte.nome }}</strong>
                  <br>
                  <span class="badge bg-secondary">{{ parte.polo }}</span>
                  <span v-if="parte.polo === 'Terceiro' && parte.tipo" class="badge bg-info ms-2">
                    {{ parte.tipo }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                @click="deletePerson(index)"
                title="Excluir Pessoa"
              >
                <i class="bi bi-trash"></i>
              </button>
            </li>
          </ul>
        </template>
      </Card>

      <!-- Botão de cadastrar -->
      <div class="mt-3">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="loading || processExists"
          @click="processAdd"
        >
          <span
            v-if="loading"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          Cadastrar
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from '@/stores/auth';
import { getProcess, addProcess } from '@/api/process.js';
import { buildData, cleanAssunto, removeAcentos } from '@/utils/index.js';
import Loader from '../Loader.vue';
import Card from '../Card.vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const processExists = ref(false);
const tabUrl = ref('');

const showOnlyMyClients = ref(true);
const process = ref({
  number: "", 
  people: [],
  details: {}
});

onMounted(async () => {
  loading.value = true;

  // Obter a guia ativa
  browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) {
      console.error("Nenhuma guia ativa encontrada.");
      errorMessage.value = "Nenhuma guia ativa encontrada.";
      loading.value = false;
      return;
    }
    const activeTab = tabs[0];
    tabUrl.value = activeTab.url;

    // Enviar mensagem para o script de conteúdo
    browser.tabs.sendMessage(activeTab.id, { type: "GET_HTML_CONTENT" }, async function (response) {
      if (browser.runtime.lastError) {
        console.error("Erro ao enviar mensagem para o script de conteúdo:", browser.runtime.lastError.message);
        errorMessage.value = "Erro ao obter conteúdo da página.";
        loading.value = false;
        return;
      }
      const htmlContent = response.html;
      // Processar o conteúdo HTML para extrair as informações do processo
      processHtmlContent(htmlContent);

      // Agora que temos o número do processo, podemos verificar se ele já existe
      if (!process.value.number) {
        errorMessage.value = 'Número do processo não encontrado na página.';
        loading.value = false;
        return;
      }

      try {
        // Verificar se o processo já existe
        const data = await getProcess(process.value.number, tabUrl.value);
        if(data.process){
          router.push({ name: 'ProcessView', params: { id: data.process.id } });
          processExists.value = true;
          process.value = data.process;
        } else {
          processExists.value = false;
        }
      } finally {
        loading.value = false;
      }
    });
  });
});

const filteredPeople = computed(() => {
  if (!showOnlyMyClients.value) return process.value.people;
  return process.value.people.filter(parte => {
    return parte.representantes.some(rep => 
      rep.toLowerCase().includes(user.value.name.toLowerCase())
    );
  });
});

function deletePerson(index) {
  if (confirm('Tem certeza que deseja remover esta parte?')) {
    process.value.people.splice(index, 1);
  }
}

const processDetailsUrl = computed(() => `${import.meta.env.VITE_APP_BASE_URL}process/details/`);
const auth = useAuthStore();
const user = computed(() => auth.user);

onMounted(async () => {
  loading.value = true;

  browser.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    if (tabs.length === 0) {
      errorMessage.value = "Nenhuma guia ativa encontrada.";
      loading.value = false;
      return;
    }
    
    const activeTab = tabs[0];
    
    browser.tabs.sendMessage(activeTab.id, { type: "GET_HTML_CONTENT" }, async function (response) {
      if (browser.runtime.lastError) {
        errorMessage.value = "Erro ao obter conteúdo da página.";
        loading.value = false;
        return;
      }
      
      const htmlContent = response.html;
      processHtmlContent(htmlContent);

      if (!process.value.number) {
        errorMessage.value = 'Número do processo não encontrado na página.';
        loading.value = false;
        return;
      }

      try {
        const data = await getProcess(process.value.number, activeTab.url);
        if(data.process){
          router.push({ name: 'ProcessView', params: { id: data.process.id } });
          processExists.value = true;
          process.value = data.process;
        }
      } finally {
        loading.value = false;
      }
    });
  });
});

async function processAdd() {
  if (processExists.value) {
    errorMessage.value = "O processo já está cadastrado.";
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const data = buildData(process, filteredPeople.value, tabUrl.value);
    const response = await addProcess(data, '/create-process-jf');
    processExists.value = true;
    process.value = response.process;
    router.push({ name: 'ProcessView', params: { id: response.process.id } });
  } catch (error) {
    errorMessage.value = "Erro ao adicionar o processo.";
    console.error('Erro ao adicionar o processo:', error);
  } finally {
    loading.value = false;
  }
}

function processHtmlContent(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Extrair número do processo
  const numeroProcesso = doc.querySelector('#cabecalhoDadosProcessoActionNumeroProcessoDecoration\\:cabecalhoDadosProcessoActionNumeroProcesso');
  process.value.number = numeroProcesso?.textContent?.trim().replace(/[a-zA-Z]/g, '') || '';

  const jurisdiction = doc.querySelector('#cabecalhoDadosProcessoActionOrgaoJulgadorDecoration\\:cabecalhoDadosProcessoActionOrgaoJulgador');
  process.value.jurisdiction = jurisdiction?.textContent?.trim() || '';

  // Extrair detalhes do processo
  const details = {
    classeJudicial: doc.querySelector('#cabecalhoDadosProcessoActionClasseJudicialDecoration span[title="Dados do Processo"]')?.textContent?.trim() || '',
    assuntos: Array.from(doc.querySelectorAll('#processoAssuntoViewGridTabList tbody tr')).map(tr => {
      const textoCompleto = tr.querySelector('span div span')?.textContent?.trim() || '';
      const partes = textoCompleto.split('|');
      return partes[partes.length - 1].trim();
    }),
    autuacao: doc.querySelector('#cabecalhoDadosProcessoActionDataAutuacaoDecoration span[title="Dados do Processo"]')?.textContent?.trim() || '',
    valorDaCausa: doc.querySelector('#cabecalhoDadosProcessoActionValorCausaDecoration span[title="Dados do Processo"]')?.textContent?.trim() || ''
  };

  process.value.details = details;

  // // Extrair partes do processo
  const poloAtivo = getPoloAtivo(doc);
  const poloPassivo = getPoloPassivo(doc);
  const terceiros = getTerceiros(doc);
  process.value.people = [
    ...poloAtivo,
    ...poloPassivo,
    ...terceiros
  ].filter(p => p.nome); // Filtra partes sem nome
}

function getPoloAtivo(doc) {
  // Localiza o tbody da tabela de Polo Ativo
  const tableBody = doc.querySelector('#namegridPartesPoloAtivoList tbody');
  if (!tableBody) {
    console.warn('Tabela de Polo Ativo não encontrada!');
    return [];
  }

  const rows = tableBody.querySelectorAll('tr');
  const resultado = [];
  let parteAtual = null;

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return; // Linha inesperada ou sem células suficientes

    // Extrai o texto "bruto"
    let nomeBruto = cells[0].innerText.trim();
    const tipo = cells[1].innerText.trim().toUpperCase();

    // Remove o trecho após " - " (que inclui OAB e estado)
    // Exemplo: "RAMON ISAAC... - RN19000" vira "RAMON ISAAC..."
    nomeBruto = nomeBruto.split(' - ')[0].trim();

    // Se não for ADVOGADO, consideramos que é uma nova parte (ex.: IMPETRANTE)
    if (tipo !== 'ADVOGADO') {
      // Se já havia uma parteAnterior armazenada, empurra para o resultado
      if (parteAtual) {
        resultado.push(parteAtual);
      }
      // Cria um novo objeto de parte
      parteAtual = {
        nome: nomeBruto,
        representantes: [],
        polo: "Ativo"
      };
    } else {
      // Sendo ADVOGADO, incluímos no array de representantes da parte atual
      if (parteAtual) {
        parteAtual.representantes.push(nomeBruto);
      }
    }
  });

  // Se existir uma parte em aberto ao final do loop, adiciona ao resultado
  if (parteAtual) {
    resultado.push(parteAtual);
  }

  return resultado;
}

function getPoloPassivo(doc) {
  // Localiza o tbody da tabela de Polo Passivo
  const tableBody = doc.querySelector('#namegridPartesPoloPassivoList tbody');
  if (!tableBody) {
    console.warn('Tabela de Polo Passivo não encontrada!');
    return [];
  }

  const rows = tableBody.querySelectorAll('tr');
  const resultado = [];
  let parteAtual = null;

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return; // Linha inesperada ou sem células suficientes

    // Extrai o texto "bruto"
    let nomeBruto = cells[0].innerText.trim();
    const tipo = cells[1].innerText.trim().toUpperCase();

    // Remove o trecho após " - " (que inclui OAB e UF)
    // Exemplo: "Fulano de Tal - DF12345" => "Fulano de Tal"
    nomeBruto = nomeBruto.split(' - ')[0].trim();

    // Se não for ADVOGADO, consideramos que é uma nova parte (ex.: IMPETRADO, AUTORIDADE, etc.)
    if (tipo !== 'ADVOGADO') {
      // Se já havia uma parteAnterior armazenada, adiciona ao resultado
      if (parteAtual) {
        resultado.push(parteAtual);
      }
      // Cria um novo objeto de parte
      parteAtual = {
        nome: nomeBruto,
        representantes: [],
        polo: "Passivo"  // Polo Passivo
      };
    } else {
      // Sendo ADVOGADO, incluímos no array de representantes
      if (parteAtual) {
        parteAtual.representantes.push(nomeBruto);
      }
    }
  });

  // Se existir uma parte em aberto ao final do loop, adiciona ao resultado
  if (parteAtual) {
    resultado.push(parteAtual);
  }

  return resultado;
}

function getTerceiros(doc) {
 // Localiza o tbody da tabela dos Outros Participantes (Terceiros)
 const tableBody = doc.querySelector('#namegridPartesOutrosParticipantesList tbody');
  if (!tableBody) {
    console.warn('Tabela de Terceiros não encontrada!');
    return [];
  }

  const rows = tableBody.querySelectorAll('tr');
  const resultado = [];
  let parteAtual = null;

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    // Precisamos de pelo menos 3 células (0 = algum ícone/posição, 1 = nome, 2 = tipo)
    if (cells.length < 3) return;

    // Nome está na coluna de índice 1
    let nomeBruto = cells[1].innerText.trim();
    // Tipo de participação está na coluna de índice 2
    const tipo = cells[2].innerText.trim().toUpperCase();

    // Remove eventual trecho após ' - '
    nomeBruto = nomeBruto.split(' - ')[0].trim();

    if (tipo !== 'ADVOGADO') {
      // Se já havia uma parteAnterior, empurra para o resultado
      if (parteAtual) {
        resultado.push(parteAtual);
      }
      // Cria uma nova parte (ex.: "CUSTOS LEGIS", "TESTEMUNHA", etc.)
      parteAtual = {
        nome: nomeBruto,
        representantes: [],
        polo: "Terceiro"  // ou "OutrosParticipantes", como preferir
      };
    } else {
      // Se for ADVOGADO, adiciona ao array de representantes
      if (parteAtual) {
        parteAtual.representantes.push(nomeBruto);
      }
    }
  });

  // Se existir uma parte em aberto, adiciona no final
  if (parteAtual) {
    resultado.push(parteAtual);
  }

  return resultado;
}

</script>

<style scoped>
.advogado-item {
  background-color: #f8f9fa;
  color: #6c757d;
}

.advogado-item .bi-person-badge {
  color: #0d6efd;
}
</style>
