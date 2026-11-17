# Corrigir a gravação de vazão

A URL originalmente fornecida ainda responde com o script antigo, sem identificar a aba nem conferir a coleta gravada. O app atualizado exige a integração **vazao-cadastro-2** antes de enviar. Isso evita uma confirmação genérica que não garante que o registro esteja na aba correta.

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

- O app confere a versão do script e identifica o destino antes de gravar.
- A gravação é conferida diretamente na aba de destino, sem depender do atraso do CSV publicado. O histórico mostra aba e linha do registro.
- Uma resposta genérica de sucesso não é tratada como gravação confirmada.
- Envios antigos ou sem confirmação podem ser retomados. O app confere se a coleta já existe antes de enviar; o script também impede duplicidade.
- O script usa a próxima linha após a última coleta nas quatro primeiras colunas. Fórmulas antecipadas não empurram o cadastro para o final da planilha.
- Preserva a formatação e as fórmulas relativas das outras colunas. Quando não houver fórmula, preenche os campos conhecidos Ano, Semana ISO, Contagem, Mês, total e Período.
- A aferição usa **15 ÷ segundos × 3.600**. A vazão aparece sem casas decimais no app, mas o valor numérico completo é mantido no cálculo e no envio.

O botão Conferir também tenta localizar coletas antigas no CSV publicado se o script ainda estiver desatualizado. Os gráficos continuam lendo essa publicação, que pode levar alguns minutos para mostrar uma coleta já confirmada diretamente na aba.

Nenhuma medição fictícia foi inserida na planilha real. Os testes de gravação usam uma planilha simulada.

Referência: [aplicativos web do Google Apps Script](https://developers.google.com/apps-script/guides/web).
