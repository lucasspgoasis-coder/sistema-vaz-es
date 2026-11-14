# Dados de vazão, adubação e roçadeira

O endereço principal abre a central de operações, com acesso direto aos três sistemas. Não há escolha de perfil, login ou cadastro de dados no aplicativo.

| Sistema | Página | Fonte |
| --- | --- | --- |
| Vazão | `vazao.html` | Planilha pública de vazão e planilha de manutenção |
| Adubação | `sistema-adubacao/index.html` | Planilha configurada no repositório de adubação |
| Roçadeira | `sistema-rocadeira/index.html` | Planilha configurada no repositório de roçadeira |

Os repositórios de adubação e roçadeira são os submódulos já existentes, sem alteração nos seus gráficos e regras. O GitHub Pages obtém esses arquivos pelas URLs declaradas em `.gitmodules`.

Para lançar ou corrigir dados, edite a planilha correspondente e use **Atualizar sistema**. Cada sistema mantém sua própria leitura e análise da fonte publicada. A publicação do Google pode levar algum tempo para refletir uma edição.

`portal.js` administra a navegação e mantém cada sistema em seu próprio quadro, preservando os filtros quando se alterna entre eles. `planilhas.js` guarda somente a última leitura real da planilha de vazão para consulta sem conexão; não cria dados simulados.

O manifesto mantém a identidade de instalação existente e muda o nome para **Dados de vazão, adubação e roçadeira**, com ícone de engrenagem. O service worker separa o cache da tela inicial e de cada sistema, evitando trocar a página inicial pela página de um quadro.

As funções de autenticação e cadastro compartilhado foram retiradas da interface. O site não carrega nem consulta o antigo serviço de cadastros.
