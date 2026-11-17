# Central de operações · Fazenda Oásis

A página inicial dá acesso direto a seis sistemas, sem tela de login.

| Sistema | Página | Dados |
| --- | --- | --- |
| Vazão | vazao.html | Planilhas públicas de vazão e manutenção |
| Adubação | sistema-adubacao/index.html | Planilha de adubação |
| Roçadeira | sistema-rocadeira/index.html | Planilha de uso dos equipamentos |
| Transplantio | sistema-transplantio/index.html | Planilhas de mudas/transplantio e produção |
| Contagem de Perdas | sistema-perdas/index.html | Formulário e histórico salvos neste aparelho |
| Documentário de Perdas | documentario/index.html | Fotos, descrições, histórico alfabético e relatórios locais |

Os quatro diretórios de sistemas são submódulos declarados em .gitmodules. Publique primeiro os commits dos submódulos e depois atualize as referências no painel.

## Planilhas

Vazão, Adubação, Roçadeira e Transplantio continuam lendo suas fontes publicadas. Use Atualizar sistema após editar as planilhas. O Transplantio abre diretamente e apresenta aviso quando uma fonte está indisponível, sem criar medições fictícias.

planilhas.js mantém a última leitura real da vazão para consulta sem conexão. O cache separa a página inicial e cada sistema.

## Histórico local de perdas

A opção escolhida pelo usuário é salvar neste aparelho. Os dados não são sincronizados automaticamente entre aparelhos.

- O formulário salva um rascunho automaticamente. Quando os campos obrigatórios são válidos, salva também o levantamento completo no histórico.
- Alterações atualizam o levantamento em edição. Novo registro preserva o anterior e inicia outro.
- IndexedDB (oasis-contagem-perdas-v1) guarda campos, causas, fotos, JPEG e PDF. A gravação só é confirmada após concluir a transação.
- Os arquivos são gerados a partir do registro salvo, com gráficos, fotos e paginação. Arquivos de versões antigas não podem substituir uma edição mais recente.
- A aba Gráficos considera o último levantamento de cada bloco/ciclo/cultura/variedade nos filtros. O percentual global usa os totais transplantados, evitando duplicar versões ou calcular uma média simples de percentuais.
- O histórico permite baixar JPEG/PDF. Backup dos dados exporta registros e fotos em JSON. Limpar os dados do navegador remove o histórico local; conserve cópias dos arquivos fora do navegador.
- O envio à planilha que já existia no módulo continua sendo uma ação manual separada. Salvar localmente não executa esse envio.

history-core.js cuida das validações, cálculos e transações; history-report.js gera arquivos sem depender do formulário atual; history.js integra salvamento automático, histórico, edição e gráficos.

## Apresentação e testes

Os módulos têm layout e ícones locais. As peças dos ícones são animadas, e os gráficos se apresentam ao entrar na tela. A preferência por movimento reduzido é respeitada; exportações permanecem estáticas. O portal ajusta a altura dos quadros ao conteúdo, mantendo a rolagem normal da página.

Com Node.js 22 ou superior, execute npm ci --ignore-scripts e npm test. As dependências de desenvolvimento verificam reabertura do armazenamento, edições concorrentes, os formulários com HTML real, navegação dos cinco módulos e geração real de JPEG/PDF. Dados fictícios existem somente nos testes e não são fontes do aplicativo.

## Documentário fotográfico de perdas

O sexto módulo associa várias fotos a um bloco, causa informada e data. Os registros são ordenados por bloco e causa com ordenação portuguesa A–Z e números naturais; datas são cronológicas e nomes de fotos são A–Z. O IndexedDB oasis-documentario-perdas-v1 mantém registros e rascunhos, fotos originais, prévias e descrições. Fotos excluídas do relatório permanecem preservadas e podem ser reincluídas. O SHA-256 é calculado sobre os bytes originais para conferir o arquivo salvo; isso não equivale a uma certificação da ocorrência.

Os relatórios PDF/JPEG são gerados dos registros completos salvos e respeitam os filtros do histórico. Cada foto inclui bloco, data, ocorrência informada, descrição, estado da revisão e identificação do original. Rascunhos incompletos não entram nos relatórios. As descrições manuais e sua revisão não são substituídas por resultados atrasados da análise automática.

### Sugestões visuais no aparelho

A análise opcional usa o modelo geral Xenova/clip-vit-base-patch32 quantizado com Transformers.js 3.7.2, executado por WebAssembly em um Web Worker. O primeiro uso baixa aproximadamente 150 MB de pesos, além do runtime. Os pesos ficam no cache do modelo; não são incluídos no repositório nem pré-baixados pelo service worker. As fotos não são enviadas para um serviço de análise: o worker recebe a prévia como Blob e executa a inferência localmente.

O modelo compara aspectos visuais pré-definidos. Não é um modelo agronômico validado para confirmar a causa de perdas. Resultados ambíguos ou imagens sem evidência agrícola recebem texto inconclusivo. A causa continua identificada como informada pelo responsável e a descrição de IA como sugestão a revisar. Se o aparelho ou a conexão não permitirem a análise, o cadastro e a descrição manual continuam disponíveis. A inferência real do backend WASM foi conferida com a imagem pública de demonstração do modelo, separadamente dos testes sem rede.

Referências de implementação: [modelo e uso](https://huggingface.co/Xenova/clip-vit-base-patch32), [aplicação no navegador](https://huggingface.co/docs/transformers.js/tutorials/vanilla-js), [RawImage.fromBlob](https://huggingface.co/docs/transformers.js/api/utils/image).

### Edição e exclusão de fotos

Os botões Editar foto e Excluir foto aparecem na galeria e nas miniaturas do histórico. O editor permite alterar o nome de exibição, corrigir a descrição e substituir a imagem. A substituição preserva a foto anterior em photoArchive e invalida a análise vinculada aos bytes da imagem anterior. Os downloads de originais mantêm o nome do arquivo original.

A exclusão retira a foto da lista ativa e dos relatórios, mas permite restauração em Fotos excluídas e versões anteriores. Excluir a última foto deixa o levantamento como rascunho, sem apagar seus arquivos. Fotos restauradas continuam em ordem alfabética. Galeria, miniaturas e áreas de foto no JPEG/PDF usam quadros 4:3; as imagens são centralizadas e contidas sem corte ou deformação.


### Cadastro rápido no Documentário
O campo Causa foi removido do cadastro. Bloco, data e uma foto bastam para documentar. O detalhamento visual é preenchido abaixo de cada imagem, salvo no histórico e incluído nos relatórios. Causas de registros antigos permanecem preservadas.


### Enviar bloco ao histórico
Após anexar fotos, Adicionar ao histórico conclui o registro, confirma a gravação e limpa o formulário para o próximo bloco. O histórico exibe todas as fotos com seu detalhamento visual. O salvamento automático continua protegendo o registro em edição.


### Causa por foto
Cada imagem possui uma lista ilustrada com 16 causas informadas pelo responsável. A seleção é opcional, independente da sugestão de IA e preservada com a foto no histórico e nos relatórios. Ícones SVG animam suas partes e respeitam a preferência por movimento reduzido.


### Justificativas por causa
Selecionar uma causa por foto gera um texto editável sobre impactos possíveis e fatores para conferir no campo. O texto é baseado na opção escolhida, não em um diagnóstico da foto. A escolha de outra causa gera outra justificativa; clicar novamente na mesma causa preserva a edição. O texto acompanha histórico e relatórios.
Referências gerais: [UMN – brócolis](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-broccoli), [UMass – distúrbios fisiológicos](https://nevegetable.org/crops/cabbage-broccoli-cauliflower-and-other-brassica-crops/physiological-disorders), [UC IPM – pulgão](https://ipm.ucanr.edu/agriculture/cole-crops/cabbage-aphid/), [UC IPM – Sciara](https://ipm.ucanr.edu/home-and-landscape/fungus-gnats/), [UC IPM – lagarta rosca](https://ipm.ucanr.edu/agriculture/cole-crops/cutworms/), [UC IPM – traça](https://ipm.ucanr.edu/agriculture/cole-crops/diamondback-moth/), [UC IPM – salinidade](https://ipm.ucanr.edu/home-and-landscape/nutrient-and-mineral-excesses-salinity-and-salt-toxicity/), [Embrapa – formiga cortadeira](https://www.cnpuv.embrapa.br/uzum/uva/formiga_corta.html). Os fatores são hipóteses gerais para revisão, sem recomendação de produto ou diagnóstico automático.


### Transplantio · Mudas por dia
A aba soma as colunas Bandejas e Mudas da planilha por dia, bloco e variedade, incluindo todos os lançamentos do grupo. Filtros independentes de dia, bloco e variedade. Inicializa no último dia disponível e exibe estado vazio quando não há registros. Mudas é o valor registrado na planilha; não há conversão estimada de bandejas em mudas.
