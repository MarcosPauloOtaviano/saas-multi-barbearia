# Auditoria de produção — BarberFlow

Data da auditoria: 24 de setembro de 2026  
Ambiente: `https://barberflow.ddns.net`  
Projeto Supabase: `cbccvccqabrvjpeiomrf`

## Resultado executivo

O fluxo principal foi auditado como cliente, administrador e barbeiro. A falha funcional mais importante encontrada era a possibilidade de selecionar apenas um serviço por reserva, mesmo quando a operação exige um combo. Isso podia liberar um intervalo menor do que o atendimento real e distorcer a agenda.

A correção foi aplicada no front-end, na função pública e no PostgreSQL. Uma reserva de Corte (30 min) + Barba (10 min) agora ocupa 40 minutos, soma os dois valores e só aparece para barbeiros vinculados aos dois serviços.

## Correções aplicadas

- Novo suporte a `serviceIds` no agendamento público e interno.
- Duração, preço e nome composto são calculados no cliente e novamente no banco (o banco é a fonte de verdade).
- Disponibilidade combinada valida o conjunto completo de serviços e encerra a grade no horário de fechamento considerando a duração total.
- `appointment_services` recebe uma linha por serviço, preservando relatório, preço e duração individual.
- A barreira de sobreposição do PostgreSQL e a idempotência por `requestId` continuam ativas.
- A home ganhou três cenas ilustradas próprias: rua, entrada e corte. A transição acompanha a rolagem; `prefers-reduced-motion` troca para uma cena estática e desliga animações.
- A composição cinematográfica foi unificada no mobile: o texto, o contraste e o enquadramento seguem a mesma hierarquia do desktop, com ajustes apenas de escala e área segura para toque.
- A agenda pública reutiliza a abertura visual da home sem prejudicar o formulário claro; o nome exibido é lido do estabelecimento atual, então cada slug apresenta sua própria marca.
- A página pública de cada estabelecimento agora reutiliza a mesma narrativa cinematográfica da home institucional. As cenas, textos de abertura e contatos são renderizados com os dados do slug acessado; a agenda, serviços e equipe continuam sendo os recursos daquele tenant.
- A camada pública foi reduzida ao essencial: marca, agendamento, serviços, equipe, contato e links de privacidade/LGPD. Cards decorativos, estatísticas redundantes e chamadas repetidas foram removidos da home institucional e da página do estabelecimento.
- Serviços e produtos públicos também foram enxugados: títulos diretos, valores, duração e ação de escolha; notas explicativas repetidas e atalhos que sugeriam conta foram retirados.

## Evidência de produção

Teste executado com Corte + Barba para 25/09/2026, barbeiro Roberto:

- disponibilidade: HTTP 200, 61 opções, Mantena e Roberto presentes;
- primeiro horário: 09:00 no fuso da barbearia;
- último horário: 17:15, respeitando 40 minutos até o fechamento às 18:00;
- reserva de auditoria criada e removida depois do teste;
- registro verificado: início 09:00, fim 09:40, duração 40 minutos, duas linhas em `appointment_services`, status pendente e origem pública;
- repetição do mesmo `requestId` devolveu o mesmo `appointmentId` (sem duplicar atendimento); o registro temporário também foi removido;
- o e-mail respondeu `not_configured`, sem impedir a reserva, como previsto quando o provedor ainda não está configurado.

## Latência observada

Medição feita com cinco chamadas HTTP consecutivas no mesmo endpoint de produção, sem incluir renderização do navegador:

| Cenário | Tempos (s) | Mediana |
| --- | --- | ---: |
| Serviço único (linha de base) | 1,644 · 1,204 · 1,425 · 2,460 · 1,184 | 1,425 |
| Corte + Barba (40 min) | 3,645 · 1,162 · 1,819 · 1,776 · 1,749 | 1,776 |

A primeira chamada combinada teve o custo de aquecimento da função; nas chamadas seguintes o acréscimo mediano foi de aproximadamente 0,35 s, esperado porque são duas consultas de disponibilidade e uma validação de conjunto. Não foi usado número inventado de uma medição anterior: a linha de base acima foi coletada no mesmo ciclo e no mesmo ambiente.

## Segurança e isolamento

- O catálogo público retorna somente uma barbearia ativa pelo slug, serviços ativos, profissionais ativos e dados institucionais públicos.
- RPCs combinadas foram criadas com validação de estabelecimento, barbeiro, serviços ativos e atribuições; a RPC pública de gravação só é executável pela função de serviço.
- O isolamento por `barbershop_id`, políticas RLS, perfis de administrador/barbeiro e restrições de conflito permanecem no código e no banco.
- Nenhum segundo estabelecimento permaneceu na produção: dois slugs e seus usuários/clientes de auditoria foram criados dentro de uma transação e revertidos; a verificação assertiva completa continua na suíte SQL versionada.
- Os registros temporários da auditoria (cliente, agendamento, serviços-filhos, token e notificação) foram removidos após a validação.

## Suíte executada

- `pnpm typecheck`: passou.
- `pnpm test`: 2 arquivos, 13 testes, passou.
- `pnpm lint`: passou.
- `pnpm build`: passou, 13 rotas geradas.
- fluxo público no navegador: catálogo carregado, dois serviços selecionados, 40 minutos exibidos, Mantena/Roberto listados e Roberto escolhido explicitamente às 15:00;
- payloads inválidos e slug inexistente: 400/404 esperados, sem gravação;
- acesso direto sem sessão a `/admin/stilo-sampa` e `/admin/stilo-sampa/agenda`: redirecionamento HTTP 307 para `/admin/stilo-sampa/entrar`;
- `pnpm exec supabase test db`: não executou localmente porque não há Postgres/Docker na máquina (`127.0.0.1:54322` recusou conexão). O arquivo `supabase/tests/tenant_isolation.test.sql` e o regression test continuam versionados para execução quando o ambiente local estiver disponível.
- A captura automatizada de viewport móvel não está disponível no conector desta sessão; a revisão móvel foi feita pelos breakpoints responsivos, DOM público e build, enquanto a captura de computador foi conferida no domínio publicado.

## Pendências externas, sem mascarar o estado

- E-mail transacional ainda depende de `RESEND_API_KEY` e de um remetente verificado no Supabase. A interface informa quando a reserva foi salva sem e-mail.
- Som e notificações do navegador funcionam com o painel aberto. Push com o app fechado exige configuração VAPID e inscrição do dispositivo; não foi simulado como concluído.

## Arquivos principais

- `supabase/migrations/20260924150000_combined_services.sql`
- `supabase/functions/public-booking/index.ts`
- `src/components/booking-wizard.tsx`
- `src/components/agenda-view.tsx`
- `src/components/platform-home.tsx`
- `public/images/barberflow-scene-01.png`, `barberflow-scene-02.png`, `barberflow-scene-03.png`
