# Notificações do Sistema integrado

No sino, escolha **Ativar fora do app**, permita as notificações e use **Enviar notificação de teste**. A ativação é individual por navegador e aparelho. No iPhone, abra a versão adicionada à Tela de Início pelo Safari.

O app recebe Web Push pelo `sw.js`. O serviço de cadastros mantém as assinaturas no banco, criptografa os avisos e monitora as planilhas de vazão, adubação, roçadeira, transplantio e manutenção, além das áreas compartilhadas. A chave privada VAPID é criada e guardada somente no banco do serviço, nunca neste repositório. Nenhuma rota pública lista assinaturas ou chaves privadas.

O workflow `notificacoes-planilhas.yml` consulta o serviço a cada cinco minutos, sem depender de um app aberto. Não recebe dados arbitrários para enviar: o servidor confere suas fontes vinculadas e produz o resumo. A primeira consulta estabelece a referência, sem avisos de dados antigos. As entregas são persistidas e retomadas em caso de falha; assinaturas expiradas são removidas. A consulta aberta no navegador continua a cada dois minutos.

O agendamento do GitHub pode atrasar e, em repositórios públicos, pode ser desativado após 60 dias sem atividade. Confira a execução em **Actions → Notificações das planilhas** e reative o workflow se necessário. [Documentação do GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

O serviço responde em `/api/push/public-key`; a verificação automatizada usa `POST /api/push/check`. O retorno contém apenas o resultado da execução. O cancelamento e o teste exigem o identificador privado do aparelho. A permissão e a entrega final dependem também das configurações de notificações do navegador e do sistema operacional.

As perdas e fotos que continuam salvas apenas neste aparelho geram avisos locais quando são registradas; não se tornam dados compartilhados por ativar o push.
