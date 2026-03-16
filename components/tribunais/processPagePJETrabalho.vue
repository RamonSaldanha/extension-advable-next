<template>
  <div class="h-100">
    <!-- Loader -->

    <Loader v-if="loading" />
    <div v-if="processExists">
      <div class="d-flex align-items-center mb-3">
        <i class="bi bi-check-circle-fill text-success me-2"></i>
        <span>Processo já cadastrado</span>
      </div>
      <a :href="processDetailsUrl + process.id" target="_blank" class="adble-ml-1">
        Ver detalhes deste processo
      </a>
      <!-- Conteúdo adicional pode ser adicionado aqui -->
    </div>
    <form v-else-if="process && partesProcesso.length">
      <div class="px-3">
        <!-- Número do processo -->
        <div class="mb-2">
          <strong>Número do Processo:</strong> {{ process.number }}
        </div>
        <!-- Órgão Julgador -->
        <div class="mb-2">
          <strong>Órgão Julgador:</strong> {{ process.jurisdiction }}
        </div>
        
        <!-- Acordeão para detalhes e partes -->
        <div class="accordion mt-4" style="font-size: .9rem;" id="processAccordion">
  
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
                Detalhes do Processo
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
                  <strong>Distribuído:</strong> {{ process.details.distribuido }}
                </div>
                <div class="mb-2">
                  <strong>Autuado:</strong> {{ process.autuacao }}
                </div>
                <div class="mb-2">
                  <strong>Valor da Causa:</strong> {{ process.details.valorDaCausa }}
                </div>
                <div class="mb-2">
                  <strong>Prioridade(s):</strong> {{ process.details.prioridades }}
                </div>
                <div class="mb-2">
                  <strong>Justiça Gratuita:</strong> {{ process.details.justicaGratuita }}
                </div>
                <div class="mb-2">
                  <strong>Tutela de Urgência:</strong> {{ process.details.tutelaDeUrgencia }}
                </div>
                <div class="mb-2">
                  <strong>Classe Judicial:</strong> {{ process.details.classeJudicial }}
                </div>
                <div class="mb-2">
                  <strong>Assunto(s):</strong>
                  <ul class="list-unstyled mb-0">
                    <li v-for="(assunto, index) in process.details.assuntos" :key="index">{{ assunto }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
  
        </div>
      </div>

      <Card class="my-4" title="Partes do processo" icon="bi-person-fill">
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
              v-for="(person, index) in filteredPartesProcesso" 
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
      <div class="mt-3 px-3">
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
    <div class="h-100 w-100 d-flex justify-content-center align-items-center" v-else>
      <button 
        class="btn mt-4" 
        :class="trabalhoPJEVersion === 'blue' ? 'btn-info' : 'btn-success'" 
        @click="openDataModal"
      >
        Capturar este processo
      </button>
    </div>
    <div class="alert alert-danger" v-if="errorMessage">{{ errorMessage }}</div>
    <div class="alert alert-success" v-if="successMessage">{{ successMessage }}</div>
  </div>
</template>

<script setup>

  import { onMounted, ref, computed } from "vue";
  import { delay, buildData, removeAcentos } from "@/utils";
  import { getProcess, addProcessTrabalho } from "@/api/process";
  import Loader from "../Loader.vue";
  import { useAuthStore } from '@/stores/auth';
  import Card from '../Card.vue';
  const loading = ref(false);
  const errorMessage = ref('');
  const successMessage = ref('');
  const tabUrl = ref('');
  const process = ref(null);
  const processNum = ref('');
  const trabalhoPJEVersion = ref('');
  const processExists = ref(false);
  const processDetailsUrl = computed(() => `${import.meta.env.VITE_APP_BASE_URL}process/details/`);
  const partesProcesso = ref([]);
  const OnlyThoseIRepresent = ref(true);
  import { useRoute, useRouter } from 'vue-router';

  const router = useRouter();

  // Obter o usuário autenticado
  const auth = useAuthStore();
  const user = computed(() => auth.user);


  const selectors = {
    blue: {
      'button-open-modal': "mat-sidenav-container > mat-sidenav-content > pje-cabecalho > div > mat-toolbar > pje-cabecalho-processo > section > div > section.info-processo > span > span > pje-descricao-processo > span > a",
      'process-num': 'mat-sidenav-container > mat-sidenav-content > pje-cabecalho > div > mat-toolbar > pje-cabecalho-processo > section > div > section.info-processo > span > span > pje-descricao-processo > span > a', // amostra da res: '0071600-36.2012.5.21.0007'
    },
    green: {
      'button-open-modal': "#titulo-detalhes > h1",
      'process-num': '#titulo-detalhes > h1', // amostra da res: 'ATSum 0000058-61.2023.5.21.0042 (12ª Vara do Trabalho de Natal)'
    }
  };

  onMounted(async () => {
    loading.value = true;
    // **1º passo = verificar qual é a versão da consulta do TRT
    // um mesmo PJE contém duas versões de consulta diferentes:
    // uma o header é verde e a outra o header é azul

    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) {
        console.error("Nenhuma guia ativa encontrada.");
        errorMessage.value = "Nenhuma guia ativa encontrada.";
        loading.value = false;
        return;
      }

      const activeTab = tabs[0];
      tabUrl.value = activeTab.url;

      browser.tabs.sendMessage(activeTab.id, { type: "GET_HTML_CONTENT" }, async function (response) {
        if (browser.runtime.lastError) {
          console.error("Erro ao enviar mensagem para o script de conteúdo:", browser.runtime.lastError.message);
          errorMessage.value = "Erro ao obter conteúdo da página.";
          loading.value = false;
          return;
        }
        const htmlContent = response.html;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const getProcessNum = (doc) => {
          const processNumElement = doc.querySelector(selectors[trabalhoPJEVersion.value]['process-num']);
          if (processNumElement) {
            const match = processNumElement.textContent.trim().match(/(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/);
            return match ? match[0] : null;
          }
          return null;
        };
        processNum.value = getProcessNum(doc);

        try {
          // Verificar se o processo já existe
          const data = await getProcess(processNum.value, tabUrl.value);
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

      // Verificar a versão do PJETrabalho com base na URL
      if (tabUrl.value.includes("/pjekz/")) {
        trabalhoPJEVersion.value = 'blue';
      } else if (tabUrl.value.includes("/consultaprocessual/")) {
        trabalhoPJEVersion.value = 'green';
      } else {
        trabalhoPJEVersion.value = 'desconhecida';
      }

    });

  });

  async function processAdd() {
    loading.value = true;
    
    // Preparar o objeto do processo para ser enviado
    const dataToSend = {
      process_num: processNum.value, // Número do processo
      jurisdiction: process.value.jurisdiction, // Órgão julgador
      autuacao: process.value.autuacao, // Autuação
      current_url: tabUrl.value, // URL atual do sistema
      details: {
        valorDaCausa: process.value.details.valorDaCausa, // Valor da causa
        assuntos: process.value.details.assuntos, // Assuntos
        classeJudicial: process.value.details.classeJudicial, // Classe judicial
        tutelaDeUrgencia: process.value.details.tutelaDeUrgencia, // Tutela de urgência
      },
      people: filteredPartesProcesso.value.map(person => ({
        nome: person.nome, // Nome da pessoa
        documento: person.documento !== 'Sem documento' ? person.documento : null, // Documento, se houver
        tipo: person.tipo, // Tipo de documento
        polo: person.polo, // Polo da parte
      })),
    };


    try {
         // Construir os dados para envio utilizando a função buildData
      // Enviar a requisição para adicionar o processo
      const response = await addProcessTrabalho(dataToSend, '/create-process-trt');

      // Atualizar o estado após a adição bem-sucedida
      processExists.value = true;
      process.value = response.process;
      router.push({ name: 'ProcessView', params: { id: response.process.id } });
    } catch (error) {
      errorMessage.value = "Erro ao cadastrar processo.";
    } finally {
      loading.value = false;
    }	

    // addProcessTRT(process.value, token)
    //   .then(data => {
    //     loading.value = false;
    //     processExists.value = true;
    //   })
    //   .catch(error => {
    //     loading.value = false; // Adicione esta linha
    //     errorMessage.value = "Algum erro ao adicionar processo";
    //   });
  }

  const deletePerson = (index) => {
    partesProcesso.value.splice(index, 1);
  };

  const filteredPartesProcesso = computed(() => {
    if (OnlyThoseIRepresent.value) {
      return partesProcesso.value.filter(parte =>
        parte.representantes?.some(representante => 
          removeAcentos(representante.toUpperCase()) === removeAcentos(user.value.oab_name.toUpperCase())
        )
      );
    } else {
      return partesProcesso.value;
    }
  });


  const extractPartesProcesso = (rootSelector, categoriaSelector, nomeSelector, documentoSelector, enderecoSelector, representanteSelector, doc) => {
    const partes = [];


    const seçõesPartes = doc.querySelectorAll(rootSelector);

    seçõesPartes.forEach(seção => {
      const categoriaElemento = seção.querySelector(categoriaSelector);
      if (!categoriaElemento) return;

      const categoriaTexto = categoriaElemento.textContent.trim();
      let polo;

      if (categoriaTexto.toLowerCase().includes('polo ativo')) {
        polo = 'Ativo';
      } else if (categoriaTexto.toLowerCase().includes('polo passivo')) {
        polo = 'Passivo';
      } else if (categoriaTexto.toLowerCase().includes('outros interessados')) {
        polo = 'Terceiro';
      }

      const elementosPartes = seção.querySelectorAll('ul.sem-padding.sem-margem-top.sem-marcacao');

      elementosPartes.forEach(elemento => {
        const reclamadoNomeElement = elemento.querySelector(nomeSelector);
        const documentoElement = Array.from(elemento.querySelectorAll(documentoSelector)).find(el => el.textContent.includes('CPF') || el.textContent.includes('CNPJ') || el.textContent.includes('CPJ'));
        const enderecoElements = Array.from(elemento.querySelectorAll(enderecoSelector)).filter(el => el.textContent.includes('CEP'));

        const reclamadoNome = reclamadoNomeElement ? reclamadoNomeElement.textContent.trim() : 'Nome não encontrado';

        const documentoMatch = documentoElement ? documentoElement.textContent.match(/(CPF|CNPJ):\s*([\d\.\-\/]+)/) : null;
        const documento = documentoMatch ? documentoMatch[2] : 'Sem documento';
        const tipo = documentoMatch ? documentoMatch[1] : 'Sem documento';

        const endereco = enderecoElements.map(el => el.textContent.trim()).join(' ');

        const representantes = [];
        const representantesLi = elemento.querySelectorAll(representanteSelector);
        representantesLi.forEach(li => {
          const nomeAdvogado = li.textContent.trim();
          if (nomeAdvogado.includes('(ADVOGADO)')) {
            representantes.push(nomeAdvogado.split(' (ADVOGADO)')[0].trim());
          }
        });

        const parte = {
          nome: reclamadoNome,
          documento: documento,
          tipo: tipo,
          endereco: endereco,
          representantes: representantes,
          polo: polo
        };
        console.log(parte)
        partes.push(parte);
      });
    });

    return partes;
  };

  const PartesProcessoTrabalhoBlue = (doc) => {
    const partes = [];
    const secoes = doc.querySelectorAll('#processo > span > div > span > ul');

    secoes.forEach(secao => {
      const poloElement = secao.querySelector('.polo .polo-header');
      if (!poloElement) return;

      const poloText = poloElement.textContent.trim();
      let polo;
      
      if (poloText.includes('Polo Ativo')) {
        polo = 'Ativo';
      } else if (poloText.includes('Polo Passivo')) {
        polo = 'Passivo';
      } else if (poloText.includes('Outros Interessados')) {
        polo = 'Terceiro';
      }

      const partesElements = secao.querySelectorAll('ul.sem-padding.sem-margem-top.sem-marcacao');

      partesElements.forEach(parteElement => {
        const nomeElement = parteElement.querySelector('pje-nome-parte .mat-tooltip-trigger.upperCase.negrito.cursor-pointer');
        const documentoElement = Array.from(parteElement.querySelectorAll('span.ng-star-inserted'))
          .find(el => el.textContent.includes('CPF') || el.textContent.includes('CNPJ'));
        
        const nome = nomeElement ? nomeElement.textContent.trim() : 'Nome não encontrado';
        const documentoMatch = documentoElement ? documentoElement.textContent.match(/(CPF|CNPJ):\s*([\d\.\-\/]+)/) : null;
        const documento = documentoMatch ? documentoMatch[2] : 'Sem documento';
        const tipo = documentoMatch ? documentoMatch[1] : 'Sem documento';

        const representantes = [];
        const representantesElements = parteElement.querySelectorAll('.partes-hierarquia .partes-representante span');
        representantesElements.forEach(rep => {
          if (rep.textContent.includes('(ADVOGADO)')) {
            representantes.push(rep.textContent.split(' (ADVOGADO)')[0].trim());
          }
        });

        partes.push({
          nome: nome,
          documento: documento,
          tipo: tipo,
          representantes: representantes,
          polo: polo
        });
      });
    });

    console.log(partes)

    return partes;
  };

  const PartesProcessoTrabalhoGreen = (doc) => {
    return extractPartesProcesso(
      '#colunas-dados-processo .coluna-polo',
      '.titulo-polo h3',
      '.nome-parte.parte-documento-valido',
      'span.ng-star-inserted',
      'span.ng-star-inserted',
      '.partes-hierarquia .partes-representante span',
      doc
    );
  };

  async function openDataModal () {

    loading.value = true;

    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) {
        console.error("Nenhuma guia ativa encontrada.");
        errorMessage.value = "Nenhuma guia ativa encontrada.";
        loading.value = false;
        return;
      }

      const activeTab = tabs[0];
      tabUrl.value = activeTab.url;

      // Injetar script para clicar no elemento diretamente na página
      browser.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: (selector) => {
            const element = document.querySelector(selector);
            if (element) {
              element.click();
              return { success: true };
            } else {
              return { success: false, error: 'Elemento não encontrado' };
            }
          },
          args: [selectors[trabalhoPJEVersion.value]['button-open-modal']]
        }
      );
    });

    await delay(3000);

    await gatheringData();

    loading.value = false;
  }

  async function gatheringData () {
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
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        // Esperar que os elementos de assuntos estejam carregados
        if( trabalhoPJEVersion.value === 'blue' ) {
          const processData = await extractBlueVersionData(doc);
          const partes = PartesProcessoTrabalhoBlue(doc);
          
          // Atualizar os valores de forma reativa
          process.value = {
            ...processData,
            details: {
              ...processData.details,
              distribuido: processData.details.distribuido || '',
              valorDaCausa: processData.details.valorDaCausa || '',
              prioridades: processData.details.prioridades || '',
              justicaGratuita: processData.details.justicaGratuita || '',
              tutelaDeUrgencia: processData.details.tutelaDeUrgencia || '',
              classeJudicial: processData.details.classeJudicial || '',
              assuntos: processData.details.assuntos || []
            }
          };
          
          partesProcesso.value = partes;
          successMessage.value = 'Dados capturados com sucesso!';
          
        } else if (trabalhoPJEVersion.value === 'green') {
          const processData = await extractGreenVersionData(doc);
          const partes = PartesProcessoTrabalhoGreen(doc);
          
          process.value = {
            ...processData,
            details: {
              ...processData.details,
              distribuido: processData.details.distribuido || '',
              valorDaCausa: processData.details.valorDaCausa || '',
              prioridades: processData.details.prioridades || '',
              justicaGratuita: processData.details.justicaGratuita || '',
              tutelaDeUrgencia: processData.details.tutelaDeUrgencia || '',
              classeJudicial: processData.details.classeJudicial || '',
              assuntos: processData.details.assuntos || []
            }
          };
          
          partesProcesso.value = partes;
          successMessage.value = 'Dados capturados com sucesso!';
        }
      });
      
    });
  }

  async function extractGreenVersionData (doc) {
    
    const dados = {};

    // Função assíncrona para encontrar um dado específico
    async function encontrarDado(labelText) {
      const dts = Array.from(doc.querySelectorAll('dt'));
      const dt = dts.find(dt => dt.textContent.trim().includes(labelText));
      if (!dt) return null;
      return dt.nextElementSibling ? dt.nextElementSibling.textContent.trim() : null;
    }

    dados['Órgão julgador'] = await encontrarDado("Órgão julgador:");
    dados['Número do Processo'] = await encontrarDado("Número do Processo:");
    dados['Distribuído'] = await encontrarDado("Distribuído:");
    dados['Autuado'] = await encontrarDado("Autuado:");
    dados['Valor da causa'] = await encontrarDado("Valor da causa:");
    dados['Prioridade(s)'] = await encontrarDado("Prioridade(s):");
    dados['justica gratuita'] = doc.querySelector('i.far.fa-check-square') ? "Processo com justiça gratuita deferida" : "Não disponível";

    // Extrair assuntos do processo
    const assuntosDts = Array.from(doc.querySelectorAll('dt')).find(dt => dt.textContent.trim() === "Assunto(s):");
    const assuntos = [];
    if (assuntosDts) {
      let ddElement = assuntosDts.nextElementSibling;
      while (ddElement && ddElement.tagName === 'DD') {
        const assuntoText = ddElement.textContent.trim();
        if (assuntoText) {
          assuntos.push(assuntoText);
        }
        ddElement = ddElement.nextElementSibling;
      }
    }
    dados['Assunto(s)'] = assuntos;
    
    // Novo formato de dados
    return {
      number: dados['Número do Processo'],
      jurisdiction: dados['Órgão julgador'],
      autuacao: dados['Autuado'],
      details: {
        tutelaDeUrgencia: await encontrarDado("Tutela de urgência:"),
        classeJudicial: await encontrarDado("Classe Judicial:"),
        valorDaCausa: dados['Valor da causa'],
        assuntos: dados['Assunto(s)'],
      },
    };
  }

  async function extractBlueVersionData(doc) {

    const dados = {};

    // Função assíncrona para encontrar um dado específico
    async function encontrarDado(labelText) {
      const dts = Array.from(doc.querySelectorAll('dt'));
      const dt = dts.find(dt => dt.textContent.trim().includes(labelText));
      if (!dt) return null;
      return dt.nextElementSibling ? dt.nextElementSibling.textContent.trim() : null;
    }

    dados['Órgão julgador'] = await encontrarDado("Órgão julgador:");
    dados['Número do Processo'] = await encontrarDado("Número do Processo:");
    dados['Distribuído'] = await encontrarDado("Distribuído:");
    dados['Autuado'] = await encontrarDado("Autuado:");
    dados['Valor da causa'] = await encontrarDado("Valor da causa:");
    dados['Prioridade(s)'] = await encontrarDado("Prioridade(s):");
    dados['justica gratuita'] = doc.querySelector('i.far.fa-check-square') ? "Processo com justiça gratuita deferida" : "Não disponível";

    // Extrair assuntos do processo
    const assuntosDts = Array.from(doc.querySelectorAll('dt')).find(dt => dt.textContent.trim() === "Assunto(s):");
    const assuntos = [];
    if (assuntosDts) {
      let ddElement = assuntosDts.nextElementSibling;
      while (ddElement && ddElement.tagName === 'DD') {
        const assuntoSpan = ddElement.querySelector('span');
        if (assuntoSpan) {
          assuntos.push(assuntoSpan.textContent.trim());
        }
        ddElement = ddElement.nextElementSibling;
      }
    }
    dados['Assunto(s)'] = assuntos;
    // Novo formato de dados
    return {
      number: dados['Número do Processo'],
      jurisdiction: dados['Órgão julgador'],
      autuacao: dados['Autuado'],
      details: {
        tutelaDeUrgencia: await encontrarDado("Tutela de urgência:"),
        classeJudicial: await encontrarDado("Classe Judicial:"),
        valorDaCausa: dados['Valor da causa'],
        assuntos: dados['Assunto(s)'],
      },
    };
  }

</script>
