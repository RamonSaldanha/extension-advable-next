<!-- src/components/tribunais/processPagePJESeabra.vue -->
<template>
  <div class="">
    <!-- Loader -->
    <Loader v-if="loading" />

    <!-- Mensagem de erro -->
    <div v-if="errorMessage" class="alert alert-warning alert-dismissible fade show" role="alert">
      {{ errorMessage }}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>

    <!-- Processo já cadastrado -->
    <div class="p-3" v-if="processExists">
      <div class="d-flex align-items-center mb-3">
        <i class="bi bi-check-circle-fill text-success me-2"></i>
        <span>Processo já cadastrado</span>
      </div>
      <a :href="processDetailsUrl + process.id" target="_blank" class="adble-ml-1">
        Ver detalhes deste processo
      </a>
      <!-- Conteúdo adicional pode ser adicionado aqui -->
    </div>

    <!-- Formulário -->
    <form v-else>

      <div class="p-3">
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
              <div class="accordion-body p-3">
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
                  <strong>Jurisdição:</strong> {{ process.details.jurisdicao }}
                </div>
                <div class="mb-2">
                  <strong>Autuação:</strong> {{ process.details.autuacao }}
                </div>
                <div class="mb-2">
                  <strong>Valor da causa:</strong> {{ process.details.valorDaCausa }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card title="Partes do processo" icon="bi-person-fill">
        <template #listGroup>
          <!-- Checkbox -->
          <div class="form-check px-5 py-4">
            <input
              class="form-check-input"
              type="checkbox"
              id="OnlyThoseIRepresent"
              v-model="OnlyThoseIRepresent"
            />
            <label class="form-check-label" for="OnlyThoseIRepresent">
              Apenas os que eu represento
            </label>
          </div>
          <!-- Lista de pessoas -->
          <ul class="list-group list-group-flush pb-1">
            <li 
              class="list-group-item d-flex justify-content-between align-items-center" 
              v-for="(person, index) in filteredPeople" 
              :key="person.id || index"
            >
              <div class="d-flex align-items-center">
                <div>
                  <strong>{{ person.nome }}</strong>
                  <br>
                  <small class="text-muted">{{ person.documento }}</small>
                  <br>
                  <span class="badge bg-secondary">{{ person.polo }}</span>
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
      <div class="pt-0 p-3 d-flex justify-content-end">
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
import { buildData, cleanAssunto, removeAcentos } from '@/utils/index.js'; // Importar buildData da pasta utils
import Loader from '../Loader.vue';
import Card from '../Card.vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();

// Variáveis reativas
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const process = ref({
  number: "",
  jurisdiction: "",
  people: [],
  autuacao: "",
  details: {}
});

const processDetailsUrl = computed(() => `${import.meta.env.VITE_APP_BASE_URL}process/details/`);

const OnlyThoseIRepresent = ref(true);
const processExists = ref(false);

// Variável reativa para armazenar a URL da aba ativa
const tabUrl = ref('');

// Obter o usuário autenticado
const auth = useAuthStore();
const user = computed(() => auth.user);
console.log(user.value);
// Computed para filtrar as pessoas
const filteredPeople = computed(() => {
  try {
    if (OnlyThoseIRepresent.value) {
      // Validações defensivas antes de filtrar
      if (!process.value.people || !Array.isArray(process.value.people)) {
        return [];
      }
      
      console.log(!user.value?.oab_name)

      if (!user.value?.oab_name) {
        console.warn('User OAB name not available for filtering');
        return process.value.people;
      }

      return process.value.people.filter(person => 
        person.representantes?.some(representante => {
          // Validação adicional para cada representante
          if (!representante) return false;
          
          const normalizedRepresentante = removeAcentos(representante);
          const normalizedOabName = removeAcentos(user.value.oab_name);
          
          return normalizedRepresentante === normalizedOabName;
        })
      );
    } else {
      return process.value.people || [];
    }
  } catch (error) {
    console.error('Error in filteredPeople computed:', error);
    return process.value.people || [];
  }
});

/**
 * Função principal executada ao montar o componente.
 */
 onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  
  try {
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
      
      console.log('Active tab URL:', activeTab.url);

      // Enviar mensagem para o script de conteúdo
      browser.tabs.sendMessage(activeTab.id, { type: "GET_HTML_CONTENT" }, async function (response) {
        try {
          if (browser.runtime.lastError) {
            console.error("Erro ao enviar mensagem para o script de conteúdo:", browser.runtime.lastError.message);
            errorMessage.value = "Erro ao obter conteúdo da página.";
            return;
          }
          
          if (!response || !response.html) {
            console.error("Resposta inválida do script de conteúdo");
            errorMessage.value = "Erro ao obter conteúdo da página.";
            return;
          }
          
          const htmlContent = response.html;
          console.log('HTML content length:', htmlContent.length);
          
          // Processar o conteúdo HTML para extrair as informações do processo
          processHtmlContent(htmlContent);

          // Agora que temos o número do processo, podemos verificar se ele já existe
          if (!process.value.number) {
            console.error('Número do processo não encontrado na página.');
            errorMessage.value = 'Número do processo não encontrado na página.';
            return;
          }

          console.log('Process number found:', process.value.number);
          
          try {
            // Verificar se o processo já existe
            console.log('Checking if process exists with data:', { 
              processNum: process.value.number, 
              systemUrl: tabUrl.value 
            });
            
            const data = await getProcess(process.value.number, tabUrl.value);
            console.log('getProcess response:', data);
            
            if(data.process){
              router.push({ name: 'ProcessView', params: { id: data.process.id } });
              processExists.value = true;
              process.value = data.process;
            } else {
              processExists.value = false;
              console.log('Process not found in database, ready for registration');
            }
          } catch (apiError) {
            console.error('API error during process check:', apiError);
            errorMessage.value = "Erro ao verificar processo no sistema.";
            processExists.value = false;
          }
        } catch (generalError) {
          console.error('General error in browser.tabs.sendMessage callback:', generalError);
          errorMessage.value = "Erro interno ao processar dados.";
        } finally {
          loading.value = false;
        }
      });
    });
  } catch (mountError) {
    console.error('Error in onMounted:', mountError);
    errorMessage.value = "Erro ao inicializar componente.";
    loading.value = false;
  }
});

// Função para deletar uma pessoa
function deletePerson(index) {
  process.value.people.splice(index, 1);
}

function processHtmlContent(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Extrair o número do processo
  process.value.number = getNumeroProcesso(doc);
  if (!process.value.number) {
    console.error('Número do processo não encontrado no conteúdo da página.');
    errorMessage.value = 'Número do processo não encontrado na página.';
    return;
  }

  // Extrair outras informações
  process.value.jurisdiction = getOrgaoJulgador(doc);
  process.value.autuacao = getAutuacao(doc);

  const maisDetalhes = doc.getElementById('maisDetalhes');
  if (!maisDetalhes) {
    console.error("Elemento 'maisDetalhes' não encontrado.");
    errorMessage.value = "Não foi possível obter os detalhes do processo.";
    return;
  }

  const dts = maisDetalhes.querySelectorAll('dt');
  const processDetails = {};

  dts.forEach(dt => {
    const dd = dt.nextElementSibling;
    switch (dt.textContent.trim()) {
      case 'Classe judicial':
        processDetails.classeJudicial = dd.textContent.trim();
        break;
        case 'Assunto':
        processDetails.assuntos = Array.from(dd.querySelectorAll('li')).map(li => cleanAssunto(li.textContent));
        break;
      case 'Jurisdição':
        processDetails.jurisdicao = dd.textContent.trim();
        break;
      case 'Autuação':
        processDetails.autuacao = dd.textContent.trim();
        break;
      case 'Valor da causa':
        processDetails.valorDaCausa = dd.textContent.trim();
        break;
      case 'Tutela/liminar?':
        processDetails.tutelaDeUrgencia = dd.textContent.trim().toUpperCase() === 'SIM';
        break;
    }
  });

  process.value.details = processDetails;

  const poloAtivo = getPoloAtivo(doc).map(person => ({ ...person, polo: 'Ativo' }));
  const poloPassivo = getPoloPassivo(doc).map(person => ({ ...person, polo: 'Passivo' }));
  const terceiros = getTerceiros(doc).map(person => ({ ...person, polo: 'Terceiro' }));

  process.value.people = [...poloAtivo, ...poloPassivo, ...terceiros];

}

/**
 * Função para adicionar o processo.
 * Utiliza a função buildData para construir os dados.
 */
 async function processAdd() {
  // Evitar adicionar processos já existentes
  if (processExists.value) {
    errorMessage.value = "O processo já está cadastrado.";
    return;
  }

  // Validações antes de enviar
  if (!process.value.number) {
    errorMessage.value = "Número do processo não disponível.";
    return;
  }

  if (!filteredPeople.value || filteredPeople.value.length === 0) {
    errorMessage.value = "Nenhuma pessoa selecionada para o processo.";
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    // Construir os dados para envio utilizando a função buildData
    const data = buildData(process, filteredPeople.value, tabUrl.value);

    console.log('Data to be sent to API:', JSON.stringify(data, null, 2));

    // Validar dados antes do envio
    if (!data.process_num || !data.jurisdiction) {
      throw new Error('Dados essenciais do processo estão faltando');
    }

    console.log('Sending request to /create-process with data:', {
      process_num: data.process_num,
      jurisdiction: data.jurisdiction,
      people_count: data.people._value?.length || 0,
      current_url: data.current_url
    });

    // Enviar a requisição para adicionar o processo
    const response = await addProcess(data, '/create-process');
    
    console.log('Response from /create-process:', response);

    if (!response || !response.process) {
      throw new Error('Resposta inválida da API');
    }

    // Atualizar o estado após a adição bem-sucedida
    processExists.value = true;
    process.value = response.process;
    
    console.log('Process successfully added, navigating to ProcessView with ID:', response.process.id);
    router.push({ name: 'ProcessView', params: { id: response.process.id } });
    
    successMessage.value = 'Processo adicionado com sucesso!';
  } catch (error) {
    console.error('Erro detalhado ao adicionar o processo:', error);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      errorMessage.value = `Erro da API (${error.response.status}): ${error.response.data?.message || 'Erro desconhecido'}`;
    } else if (error.request) {
      console.error('Network Error:', error.request);
      errorMessage.value = "Erro de rede. Verifique sua conexão.";
    } else {
      console.error('General Error:', error.message);
      errorMessage.value = `Erro ao adicionar o processo: ${error.message}`;
    }
  } finally {
    loading.value = false;
  }
}


/**
 * Função para construir os dados para envio.
 * Agora localizada em src/utils/index.js
 * Utilizada a função buildData importada
 * function buildData(processData, people, url) { ... }
 */

/**
 * Função para processar o conteúdo HTML da página.
 * Já definida anteriormente.
 */

/**
 * Funções auxiliares para extrair informações do documento
 */
function getNumeroProcesso(doc) {
  let padrao = /(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/;
  let texto = doc.querySelector('.titulo-topo')?.textContent || '';
  let resultado = padrao.exec(texto);

  return resultado ? resultado[1] : null;
}

function getAutuacao(doc) {
  let padrao = /Autuação<\/dt>\s*<dd>(.*?)<\/dd>/;
  let texto = doc.getElementById('maisDetalhes')?.innerHTML || '';
  let resultado = padrao.exec(texto);

  return resultado ? resultado[1].trim() : null;
}

function getOrgaoJulgador(doc) {
  let padrao = /Órgão julgador<\/dt>\s*<dd>(.*?)<\/dd>/;
  let texto = doc.getElementById('maisDetalhes')?.innerHTML || '';
  let resultado = padrao.exec(texto);

  return resultado ? resultado[1].trim() : null;
}

function extrairInformacoes(texto) {
  let regex = /^(.*?)\s-\sOAB/;
  let match = texto.match(regex);

  return match ? match[1] : texto;
}

function getTerceiros(doc) {
  let elementosTerceiros = doc.querySelectorAll('#outrosInteressados .table tbody tr td');
  let terceiros = [];

  elementosTerceiros.forEach(elemento => {
    let texto = elemento.textContent;
    let padrao = /(.+?)(?: - (CPF|CNPJ): ([\d./-]+))?(?=\s*\(|\s*$)/;
    let resultado = padrao.exec(texto);

    // Obter os nomes dentro dos elementos <li>
    let nomesLi = [];
    let lis = elemento.querySelectorAll('ul.tree li');
    lis.forEach(li => {
      let nomeLi = extrairInformacoes(li.textContent.trim());
      nomesLi.push(nomeLi);
    });

    if (resultado) {
      let documento = resultado[3] || 'Sem documento';
      let tipo = resultado[2] || 'Sem documento';
      terceiros.push({
        nome: resultado[1].trim(),
        documento: documento,
        tipo: tipo,
        representantes: nomesLi
      });
    } else {
      terceiros.push({
        nome: texto.trim(),
        documento: 'Sem documento',
        tipo: 'Sem documento',
        representantes: nomesLi
      });
    }
  });

  return terceiros; 
}

function getPoloAtivo(doc) {
  let elementosPoloAtivo = doc.querySelectorAll('#poloAtivo .table tbody tr td');
  let poloAtivo = [];

  elementosPoloAtivo.forEach(elemento => {
    let texto = elemento.textContent;
    let padrao = /(.+?)(?: - (CPF|CNPJ): ([\d./-]+))?(?=\s*\(|\s*$)/;
    let resultado = padrao.exec(texto);
    let nomesLi = [];
    let lis = elemento.querySelectorAll('ul.tree li');
    lis.forEach(li => {
      let nomeLi = extrairInformacoes(li.textContent.trim());
      nomesLi.push(nomeLi);
    });

    if (resultado) {
      let documento = resultado[3] || 'Sem documento';
      let tipo = resultado[2] || 'Sem documento';
      poloAtivo.push({
        nome: resultado[1].trim(),
        documento: documento,
        tipo: tipo,
        representantes: nomesLi
      });
    } else {
      poloAtivo.push({
        nome: texto.trim(),
        documento: 'Sem documento',
        tipo: 'Sem documento',
        representantes: nomesLi
      });
    }
  });

  return poloAtivo;
}

function getPoloPassivo(doc) {
  let elementosPoloPassivo = doc.querySelectorAll('#poloPassivo .table tbody tr td');
  let poloPassivo = [];

  elementosPoloPassivo.forEach(elemento => {
    let texto = elemento.textContent;
    let padrao = /(.+?)(?: - (CPF|CNPJ): ([\d./-]+))?(?=\s*\(|\s*$)/;
    let resultado = padrao.exec(texto);
    let nomesLi = [];
    let lis = elemento.querySelectorAll('ul.tree li');
    lis.forEach(li => {
      let nomeLi = extrairInformacoes(li.textContent.trim());
      nomesLi.push(nomeLi);
    });
    if (resultado) {
      let documento = resultado[3] || 'Sem documento';
      let tipo = resultado[2] || 'Sem documento';
      poloPassivo.push({
        nome: resultado[1].trim(),
        documento: documento,
        tipo: tipo,
        representantes: nomesLi
      });
    } else {
      poloPassivo.push({
        nome: texto.trim(),
        documento: 'Sem documento',
        tipo: 'Sem documento',
        representantes: nomesLi
      });
    }
  });

  return poloPassivo;
}
</script>
