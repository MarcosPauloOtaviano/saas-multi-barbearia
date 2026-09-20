# Stilo Sampa — experiência do cliente + gestão multi-barbearia

PWA mobile-first para clientes agendarem, acompanharem horários e voltarem à barbearia com facilidade, apoiada por uma área de gestão multi-tenant.

## O que está incluído

- início voltado ao cliente com próximo horário, repetição de serviço, sugestão de retorno, equipe e atalhos;
- área do cliente para horários, serviços, perfil e privacidade;
- painel da barbearia separado em `/admin`, com próximo cliente e alertas acionáveis;
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

O sistema abre em modo demonstração quando as variáveis Supabase não estão configuradas. Esse modo é apropriado para validar interface e fluxos; produção usa as tabelas, políticas e Edge Functions presentes em `supabase/`.

## Executar localmente

Requisitos: Node.js 22+ e pnpm.

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000` para a experiência do cliente. O painel operacional fica em `http://localhost:3000/admin` e o fluxo de reserva em `http://localhost:3000/b/stilo-sampa`.

O cliente agenda sem conta obrigatória. A equipe usa contas individuais convidadas por e-mail, com permissões por função e isolamento de agenda para barbeiros. A auditoria completa está em [`docs/ROLE_AND_BOOKING_AUDIT.md`](docs/ROLE_AND_BOOKING_AUDIT.md).

## Conectar ao Supabase

1. Copie `.env.example` para `.env.local`.
2. Preencha somente a URL e a chave publicável no frontend.
3. Inicie ou vincule um projeto Supabase.
4. Aplique as migrations na ordem gerada.
5. Configure `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` e `IP_HASH_SALT` como secrets das Edge Functions.
6. Publique `process-reminders`, `public-booking` e `appointment-response`.
7. Agende `process-reminders` com Supabase Cron.

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
