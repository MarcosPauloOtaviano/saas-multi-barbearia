# Atualização de memória — seleção de barbeiro e links multi-tenant

Data: 20 de setembro de 2026

## Decisões consolidadas

- O cliente pode escolher um barbeiro específico ou “Primeiro disponível”.
- “Primeiro disponível” consulta todos os profissionais ativos e habilitados para o serviço. Cada horário retornado já contém o barbeiro concreto que está livre.
- O ID abstrato `any` nunca é enviado para a criação da reserva; antes da confirmação ele é resolvido para um barbeiro real.
- Se Mantena estiver ocupado às 15h e Roberto estiver livre, 15h permanece disponível e é associado a Roberto.
- Se o cliente selecionar Mantena manualmente, 15h não aparece.
- Cada barbearia usa `/b/[slug]`, por exemplo `/b/stilo-sampa` e `/b/salao-dos-cobras`.
- Nome, mensagem, serviços, equipe, disponibilidade e reservas são isolados por `barbershop_id`.
- O link da marca na agenda pública permanece no próprio tenant.
- Clientes continuam agendando sem conta; equipe usa contas individuais convidadas por proprietário ou gerente.

## Segurança preservada

- A Edge Function pública usa a chave privilegiada somente no servidor.
- A disponibilidade filtra tenant, serviço, relação `barber_services`, barbeiro ativo, jornada, folgas e conflitos.
- A exclusão temporal GiST no PostgreSQL continua sendo a barreira final contra corrida de reservas.
- O `booking_request_id` preserva idempotência contra duplo clique ou repetição de requisição.
- A identidade normalizada do cliente impede duplicação e dois atendimentos simultâneos em profissionais diferentes.

## Evidências de teste

- Teste unitário: Mantena ocupado às 15h resulta em Roberto.
- Teste unitário: todos ocupados resulta em nenhum barbeiro disponível.
- Navegador: “Primeiro disponível” ofereceu 10h20 com Caio quando João estava ocupado.
- Navegador: escolhendo João diretamente, 10h20 foi removido.
- Navegador: `/b/salao-dos-cobras` abriu com identidade e título próprios.
- Navegador: admin acessou Equipe e convite; barbeiro recebeu bloqueio nessa área.
- `pnpm check`: typecheck, 6 testes, lint e build de produção aprovados.
