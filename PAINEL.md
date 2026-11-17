# Central de operações · Fazenda Oásis

A página inicial dá acesso direto a cinco sistemas, sem tela de login.

| Sistema | Página | Dados |
| --- | --- | --- |
| Vazão | vazao.html | Planilhas públicas de vazão e manutenção |
| Adubação | sistema-adubacao/index.html | Planilha de adubação |
| Roçadeira | sistema-rocadeira/index.html | Planilha de uso dos equipamentos |
| Transplantio | sistema-transplantio/index.html | Planilhas de mudas/transplantio e produção |
| Contagem de Perdas | sistema-perdas/index.html | Formulário e histórico salvos neste aparelho |

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

Com Node.js 22 ou superior, execute npm ci e npm test. As dependências de desenvolvimento verificam reabertura do armazenamento, edições concorrentes, os formulários com HTML real, navegação dos cinco módulos e geração real de JPEG/PDF. Dados fictícios existem somente nos testes e não são fontes do aplicativo.
