# Atualização de memória — escolha entre profissionais e fotos de perfil

Data: 20 de setembro de 2026

## Decisões consolidadas

- Quando vários barbeiros estão livres no mesmo horário, o cliente deve poder escolher exatamente quem realizará o atendimento.
- A opção pública se chama “Escolher pelo horário”: primeiro o cliente escolhe o horário e depois vê todos os profissionais livres naquele momento.
- Um horário aparece uma única vez, com a quantidade de profissionais disponíveis; a lista interna preserva todos os barbeiros elegíveis.
- Se houver mais de um profissional livre, o botão de avançar permanece bloqueado até uma escolha explícita.
- Se houver somente um profissional livre, ele pode ser atribuído automaticamente.
- Quando o cliente escolhe um barbeiro antes do horário, o fluxo continua mostrando somente a agenda daquele profissional.
- A reserva sempre envia um `barber_id` concreto. A proteção contra sobreposição e a idempotência continuam sendo garantidas pelo PostgreSQL.

## Fotos de perfil

- Proprietário e gerente podem enviar foto para qualquer barbeiro da própria barbearia no módulo Equipe.
- São aceitos JPEG, PNG e WebP com até 5 MB.
- A foto aparece nos cartões da equipe, na apresentação pública e nos seletores do agendamento; sem imagem, a interface usa iniciais.
- No modo Supabase, as imagens usam o bucket público `barber-media` e a URL fica em `barbers.avatar_url`.
- A escrita e a exclusão no Storage são restritas por RLS a proprietário e gerente ativos, validando tenant e barbeiro pelo caminho do objeto.
- Cada upload usa um nome UUID novo; depois da atualização do banco, o arquivo anterior é removido quando possível.
- No modo demonstração, a foto é apenas uma prévia local durante a sessão e não simula persistência remota.

## Evolução prevista

- O bucket já reserva o padrão `barber-media/{barbershop_id}/portfolio/{barber_id}/` para uma futura galeria de cortes.
- A galeria será implementada separadamente, com modelo próprio para ordenação, legenda, moderação, limite e exclusão segura.

## Evidências de teste

- Teste unitário com quatro barbeiros livres às 15h retorna os quatro profissionais.
- Navegador: horário das 16h30 mostrou três profissionais livres e exigiu seleção antes de avançar.
- Navegador: escolher Leonardo marcou o cartão correto e habilitou a continuação.
- Navegador: o módulo Equipe exibiu controle de foto para os barbeiros e não produziu erros no console.
- `pnpm typecheck`, `pnpm test` (7 testes), `pnpm lint` e `pnpm build` foram aprovados.
- A Edge Function `public-booking` passou na checagem isolada de sintaxe TypeScript.
- A validação integrada das políticas de Storage ainda depende de Supabase local com Docker ou de um projeto de staging.
