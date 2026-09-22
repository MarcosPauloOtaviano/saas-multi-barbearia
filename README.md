# Stilo Sampa — experiência do cliente + gestão multi-barbearia

PWA mobile-first para clientes agendarem, acompanharem horários e voltarem à barbearia com facilidade, apoiada por uma área de gestão multi-tenant.

## O que está incluído

- início voltado ao cliente com próximo horário, repetição de serviço, sugestão de retorno, equipe e atalhos;
- área do cliente para horários, serviços, perfil e privacidade;
- painel de cada barbearia separado por slug, como `/admin/stilo-sampa`, com próximo cliente e alertas acionáveis;
- agenda diária/semanal com criação, encaixe, remarcação, confirmação, conclusão e cancelamento;
- bloqueio de dupla reserva no PostgreSQL;
- cadastro e inteligência de retorno de clientes;
- serviços, barbeiros, horários de trabalho e folgas;
- relatórios operacionais e faturamento estimado;
- central de notificações com deep links;
- lembretes de 24h e 2h por e-mail, com fila idempotente e histórico;
- página pública de agendamento por slug;
- confirmação/cancelamento por link com token armazenado como hash;
- PWA instalável e estrutura de Web Push;
- Supabase Auth SSR, RLS multi-tenant e testes pgTAP de isolamento;
- controles de retenção e solicitações LGPD.

Sem as variáveis do Supabase, o sistema não simula gravações nem exibe dados fictícios. A área da equipe permanece bloqueada até a conexão de produção estar configurada.

## Executar localmente

Requisitos: Node.js 22+ e pnpm.

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000` para a experiência do cliente. O painel da Stilo Sampa fica em `http://localhost:3000/admin/stilo-sampa` e o fluxo de reserva em `http://localhost:3000/b/stilo-sampa`.

O cliente agenda sem conta obrigatória. A equipe usa contas individuais convidadas por e-mail, com permissões por função e isolamento de agenda para barbeiros. A auditoria completa está em [`docs/ROLE_AND_BOOKING_AUDIT.md`](docs/ROLE_AND_BOOKING_AUDIT.md).

## Conectar ao Supabase

1. Copie `.env.example` para `.env.local`.
2. Preencha somente a URL e a chave publicável no frontend.
3. Inicie ou vincule um projeto Supabase.
4. Aplique as migrations na ordem gerada.
5. Configure `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` e `IP_HASH_SALT` como secrets das Edge Functions.
6. Publique `process-reminders`, `public-booking` e `appointment-response`.
7. Agende `process-reminders` com Supabase Cron.

### E-mails transacionais em produção

O cadastro do horário continua válido mesmo quando o provedor de e-mail falha. A tela agora informa essa situação ao cliente e a função registra o motivo nos logs da Edge Function, em vez de afirmar que a mensagem foi enviada sem confirmação.

No Resend, verifique o domínio usado no remetente e depois configure estes secrets no projeto Supabase (Edge Functions > Secrets):

```text
RESEND_API_KEY=...
EMAIL_FROM=Stilo Sampa <agenda@dominio-verificado.com>
APP_URL=https://barberflow.ddns.net
IP_HASH_SALT=...
CRON_SECRET=...
```

O job de lembretes precisa ser criado uma única vez no SQL Editor com `supabase/cron.example.sql`, trocando a URL pelo projeto real e preenchendo o segredo em `private.cron_secrets`. Sem esse job, os lembretes permanecem pendentes mesmo com o Resend configurado. Consulte o histórico em `cron.job_run_details` e as tentativas em `public.reminder_deliveries`.

Depois de aplicar as migrations, vincule as credenciais reais de Mantena uma única vez, somente em um terminal seguro:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
STILO_ADMIN_EMAIL=... \
STILO_ADMIN_PASSWORD=... \
CONFIRM_PRODUCTION_RESET=STILO_SAMPA \
pnpm bootstrap:stilo-owner
```

O cadastro público está fechado. Novos profissionais entram somente por convite do proprietário, e cada login é validado contra o slug do estabelecimento.

A chave `service_role` nunca deve existir em variável `NEXT_PUBLIC_*`.

## Validação

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Com Docker e Supabase local disponíveis:

```bash
pnpm exec supabase start
pnpm exec supabase test db
pnpm exec supabase db lint --local --level error
```

Consulte [arquitetura](docs/ARCHITECTURE.md), [segurança](docs/SECURITY.md) e [estratégia de testes](docs/TESTING.md).

## Escopo deliberadamente excluído

- abertura e fechamento de caixa;
- sangria, troco e fluxo financeiro;
- WhatsApp pago no lançamento;
- aplicativo nativo obrigatório;
- armazenamento de credenciais no repositório.
