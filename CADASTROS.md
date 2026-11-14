# Cadastro e aplicativo Vazão Oasis

O site continua no GitHub Pages. A interface consulta as planilhas públicas e um serviço compartilhado, com banco D1, para os lançamentos feitos no app.

- Serviço: `https://oasis-vazao-cadastros-20261114.snappylace5.chatgpt.site`
- Projeto Sites: `appgprj_6af8473584a08191a0c734a6af272096`
- Fonte do serviço: repositório Sites próprio; checkout local em `cadastros-api/`, ignorado pelo repositório do site.
- Credenciais do gestor: verificadas exclusivamente no servidor. As variáveis protegidas são `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` e `AUTH_PEPPER`. A senha não faz parte do código público.
- O visitante pode ler os registros públicos. Toda gravação exige uma sessão de gestor validada no servidor, com validade de oito horas e limitação de tentativas de login.

## Dados e histórico

As planilhas permanecem sem alteração. Novas vazões feitas no app para um mesmo poço/data substituem o valor efetivo dos gráficos; o histórico mantém cada lançamento. Manutenções são adicionadas como fichas técnicas. Uma parada com o mesmo poço e início utiliza o último retorno cadastrado. Conexões R2/R3 vêm da planilha Análise.

Os dados do sistema são compartilhados entre dispositivos. A consulta é atualizada a cada 30 segundos enquanto o app estiver visível, ao voltar a conexão e ao pressionar Atualizar. O histórico tem filtros e paginação.

O navegador mantém uma cópia dos dados públicos para consulta sem conexão. Não há cadastro offline: uma gravação só é confirmada depois de ser salva pelo servidor. Falhas preservam os campos preenchidos. Dados fictícios não são usados quando a planilha estiver indisponível.

## Instalação

`manifest.webmanifest`, `sw.js` e os ícones em `icons/` habilitam instalação como PWA nos navegadores compatíveis. A entrada oferece instalação; o usuário também pode usar o botão Instalar app. Em navegadores sem prompt automático, o app mostra as instruções do menu do navegador.

## Verificações

Os testes da interface estão em `tests/app-access.test.mjs`. Os testes do serviço ficam em `cadastros-api/tests/api.test.mjs` e verificam autenticação, gravação, leitura pública, idempotência e validação. O serviço não permite gravação apenas por uma alteração visual de perfil no navegador.
