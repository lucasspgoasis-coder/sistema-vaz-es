# Corrigir a gravação de vazão

A nova implantação fornecida pelo proprietário foi verificada em leitura em 17/11/2026: versão **vazao-cadastro-2**, planilha **Controle de Vazão de Poços - SPG Oásis**, aba **base de dados**. O app já usa essa URL e migra o endereço antigo salvo no aparelho. Outros endereços configurados manualmente são preservados. O cadastro aceita o comprovante de gravação com aba e linha devolvido pelo script e consulta diretamente a aba nas retomadas ou quando a resposta falha.

## Atualizar a implantação existente

1. No app, vá a **Vazão → 06 · Cadastro → Conexão com a planilha** e clique em **Copiar código atualizado**. Também pode [baixar integracao-vazao.gs](integracao-vazao.gs).
2. Abra a planilha de vazão original e vá a **Extensões → Apps Script**. Substitua as funções antigas e auxiliares pelo código copiado e salve.
3. Vá a **Implantar → Gerenciar implantações → Editar** e selecione **Nova versão**. Atualize a implantação existente, mantendo as configurações de execução e acesso já autorizadas para o aplicativo. **Salvar o código sozinho não atualiza o endereço publicado.**
4. Se criou uma implantação nova, copie a nova URL terminada em **/exec** e cole no campo URL do app. Clique em **Verificar conexão**. Essa configuração fica salva neste aparelho.
5. A conexão deve mostrar o nome da planilha e da aba de vazão. Só então use **Enviar à planilha** ou **Retomar envio** no histórico para recuperar uma coleta anterior.

## Escolha da planilha e da aba

A aba é identificada pelos quatro primeiros cabeçalhos: **Data | Poço | Hora | Vazão (L/H)**. Se houver mais de uma aba com esses cabeçalhos, defina a propriedade de script **VAZAO_ABA** com o nome exato da aba correta.

Se o projeto não estiver vinculado à planilha, configure a propriedade **VAZAO_PLANILHA_ID** com o ID da planilha original (o trecho entre /d/ e /edit no endereço de edição). A URL publicada com /d/e/ não é o ID de edição.

## O que foi corrigido

- O app confere a versão e o destino uma vez e reutiliza a conexão por até dez minutos. Ao abrir Cadastro, já inicia essa preparação.
- No envio normal, o comprovante retornado depois da gravação identifica aba e linha. Isso elimina duas consultas completas extras. Uma resposta sem aba e linha exige conferência direta; uma resposta genérica não basta.
- Uma resposta genérica de sucesso não é tratada como gravação confirmada.
- Envios antigos ou sem confirmação podem ser retomados. O app confere se a coleta já existe antes de enviar; o script também impede duplicidade.
- O script usa a próxima linha após a última coleta nas quatro primeiras colunas. Fórmulas antecipadas não empurram o cadastro para o final da planilha.
- Preserva a formatação e as fórmulas relativas das outras colunas. Quando não houver fórmula, preenche os campos conhecidos Ano, Semana ISO, Contagem, Mês, total e Período.
- A aferição usa **15 ÷ segundos × 3.600**. A vazão aparece sem casas decimais no app, mas o valor numérico completo é mantido no cálculo e no envio.

O botão Conferir também tenta localizar coletas antigas no CSV publicado se o script ainda estiver desatualizado. Os gráficos continuam lendo essa publicação, que pode levar alguns minutos para mostrar uma coleta já confirmada diretamente na aba.

Nenhuma medição fictícia foi inserida na planilha real. Os testes de gravação usam uma planilha simulada.

Referência: [aplicativos web do Google Apps Script](https://developers.google.com/apps-script/guides/web).


## Otimização de rapidez e falhas temporárias

A melhoria do app já funciona com a implantação v2 existente: conexão compartilhada, uma chamada de gravação para uma nova coleta, recuperação automática quando a gravação ocorreu mas a resposta falhou e uma repetição controlada para erros temporários. Usa sempre os mesmos dados e confere existência antes de repetir.

Para reduzir também o processamento no Google, copie novamente o código atualizado em Cadastro → Conexão e publique uma Nova versão da **mesma implantação**. A URL pode permanecer igual. O código otimizado busca de baixo para cima, descarta poços e valores incompatíveis antes de formatar datas, lê as fórmulas em lote e retorna BUSY para ocupação temporária. O protocolo continua vazao-cadastro-2 e os cadastros anteriores são preservados. A confirmação não é um prazo garantido: a disponibilidade e as cotas do Google continuam podendo afetar a resposta.

Referências: [boas práticas de desempenho](https://developers.google.com/apps-script/guides/support/best-practices) e [bloqueio para gravações simultâneas](https://developers.google.com/apps-script/reference/lock/lock).

## Lista de aferições e envio conjunto
No Cadastro, preencha cada aferição e clique em **Adicionar à lista de envio**. Ao terminar, clique em **Enviar todas à planilha**. A lista fica salva neste aparelho. O aplicativo usa a implantação atual e envia as coletas em sequência para evitar concorrência na planilha, confirmando cada linha. Registros confirmados saem da lista; falhas permanecem para retomar pelo mesmo botão, com conferência antes de uma nova tentativa. Não é necessário alterar o Apps Script para usar a lista.
