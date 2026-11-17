# Cadastro de vazão no Sistema integrado

A aba **Vazão → 06 · Cadastro** recebe data, hora, poço e segundos para encher **15 litros**. Calcula **15 ÷ segundos × 3.600**, em L/h, e envia um número ao Apps Script, sem separador de milhar. Exemplo: 30 segundos = 1.800 L/h.

## Conexão atual

A URL fornecida pelo proprietário já está configurada no app. O código original aceita JSON com `data`, `poco`, `hora` e `vazao`, mas usa a aba ativa e `appendRow`, sem garantir as outras colunas da planilha. O cadastro é compatível com esses campos; a versão abaixo corrige o destino e o preenchimento das colunas automáticas.

## Atualizar o Apps Script existente

1. Abra **a planilha de vazão original** e vá a **Extensões → Apps Script**.
2. Substitua as funções `doPost` e `doGet` pelo conteúdo de [integracao-vazao.gs](integracao-vazao.gs), incluindo as funções auxiliares. Salve.
3. Vá a **Implantar → Gerenciar implantações**, edite a implantação do endereço já fornecido e escolha **Nova versão**. Mantenha a execução como proprietário e a configuração de acesso necessária ao app. Atualize a mesma implantação para conservar a URL `/exec`.
4. A aba deve ter nas quatro primeiras colunas: **Data | Poço | Hora | Vazão (L/H)**. O script identifica essa aba pelos cabeçalhos. Se mais de uma aba tiver esses cabeçalhos, defina a propriedade de script `VAZAO_ABA` com o nome exato da aba correta.

O script ocupa a próxima linha após a última coleta nas quatro primeiras colunas, mesmo que existam fórmulas antecipadas abaixo. Preserva o formato da coleta anterior e reaproveita as fórmulas relativas das outras colunas. Para os cabeçalhos publicados, também preenche Ano, Semana ISO, Contagem (nome do mês), Mês, total (hora) e Período quando não houver fórmula. Não reordena nem altera coletas antigas.

## Uso diário

Preencha a coleta, confira a prévia e clique em **Enviar à planilha de vazão**. O histórico local guarda também os segundos. Só uma resposta JSON explícita `status: success` confirma o recebimento. O app não usa `no-cors` nem considera uma resposta opaca como sucesso.

Em caso de falha na conexão, o cadastro pode ter sido recebido. Use **Conferir na planilha** antes de reenviar. A conferência compara data, poço, hora e vazão com o CSV publicado; essa publicação pode demorar para refletir novas linhas. A versão ajustada do script evita duplicar uma coleta já existente com os mesmos dados. O app bloqueia também reenvios locais de aferições confirmadas ou sem confirmação.

Depois, use **Atualizar dados dos gráficos**. Não foram inseridas medições fictícias para testar a integração.

Referência técnica: [aplicativos web do Google Apps Script](https://developers.google.com/apps-script/guides/web).
