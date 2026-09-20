# Segurança e privacidade

## Controles implementados

- RLS em toda tabela exposta.
- Grants explícitos; tabelas não são autoexpostas.
- Políticas independentes para leitura, criação, alteração e exclusão.
- Papéis armazenados em `memberships`, nunca em metadado editável pelo usuário.
- `service_role` restrita às Edge Functions.
- Funções privilegiadas com `search_path` vazio e `EXECUTE` revogado por padrão.
- Views de relatório com `security_invoker`.
- Tokens públicos armazenados apenas como hash.
- Limitação de tentativas públicas por hash de IP com salt secreto.
- Logs operacionais sem conteúdo integral de e-mail, telefone ou tokens.
- Fotos públicas isoladas por tenant e barbeiro no Storage; somente proprietário e gerente podem enviar ou excluir.
- Upload de avatar limitado a JPEG, PNG ou WebP e 5 MB, com nome aleatório e sem sobrescrita de arquivo.

## Antes de produção

1. Definir os secrets das Edge Functions no cofre do Supabase.
2. Configurar domínio e remetente verificados no provedor de e-mail.
3. Habilitar HTTPS, redirect HTTP→HTTPS, HSTS e cookies seguros na hospedagem.
4. Ativar CAPTCHA na página pública conforme o volume de abuso observado.
5. Executar `supabase db advisors` e revisar findings de segurança e desempenho.
6. Executar os testes de isolamento contra o projeto de staging.
7. Definir política formal de retenção, exportação e exclusão LGPD.
8. Ativar MFA para administradores quando o fluxo operacional estiver validado.

Nenhuma credencial real deve ser adicionada a arquivos, commits, logs ou documentação.
# Acesso da equipe

- O proprietário e o gerente convidam usuários pela Edge Function `invite-team-member`.
- A chave secreta/service role permanece somente na Edge Function.
- O convite cria uma membership com status `invited`; o callback autenticado chama `accept_team_invitation()` para ativá-la.
- Barbeiros são vinculados a `barbers.membership_id` e as políticas RLS limitam clientes, agendamentos, itens de serviço e avisos ao próprio profissional.
- Funções nunca são autorizadas por `user_metadata`; a fonte de verdade é `memberships` no banco.

# Reservas duplicadas

- uma exclusion constraint bloqueia sobreposição do mesmo barbeiro;
- uma segunda exclusion constraint bloqueia sobreposição do mesmo cliente, mesmo com barbeiros diferentes;
- `booking_request_id` impede que um retry crie outra reserva;
- advisory lock por e-mail/telefone normalizado evita criação concorrente de clientes duplicados.

# Mídia pública dos barbeiros

- O bucket `barber-media` é público somente para leitura, porque as fotos precisam aparecer antes do login.
- As políticas de `storage.objects` validam o tenant, a pasta `avatars`, o barbeiro de destino e a função ativa do usuário.
- A atualização do registro `barbers.avatar_url` continua protegida pelas políticas RLS da tabela.
- Ao trocar a foto, o sistema envia primeiro um arquivo com nome único, atualiza o registro e tenta remover o objeto anterior; uma falha no banco não deixa a nova URL ativa.
- Arquivos de documentos, dados pessoais ou conteúdo privado não devem usar esse bucket.
