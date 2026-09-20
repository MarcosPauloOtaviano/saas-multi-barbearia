# Arquitetura e decisões

## Limites do sistema

- A raiz do produto é a experiência pública do cliente; a operação interna fica isolada em `/admin/[slug]` e nas rotas protegidas de gestão.
- O cliente não precisa criar senha: cada agendamento pode ser confirmado ou cancelado pelo link seguro enviado ao e-mail.
- O navegador apresenta a interface, mas não decide autorização, disponibilidade, preço ou transições críticas.
- O PostgreSQL é a última barreira para isolamento e conflito de horários.
- Edge Functions concentram operações públicas e integrações que exigem chave privilegiada.
- Sem conexão com o Supabase, a aplicação permanece vazia e bloqueia operações; nunca simula persistência de produção.

## Multi-tenant

`barbershop_id` existe em todas as entidades operacionais. `memberships` relaciona usuário, tenant, papel e estado. As políticas consultam associação ativa diretamente no banco; `user_metadata` não participa da autorização.

Cada barbearia possui um slug público próprio em `/b/[slug]` e um painel próprio em `/admin/[slug]`. Nome, mensagem, catálogo, profissionais, serviços habilitados e disponibilidade são resolvidos pelo tenant encontrado a partir desse slug. O login exige uma associação ativa no mesmo tenant; credenciais de outra barbearia não autorizam acesso cruzado.

Funções auxiliares ficam no schema `private`, usam `search_path` vazio e têm execução revogada de `PUBLIC`. Funções públicas com `SECURITY DEFINER` são concedidas somente ao papel necessário.

## Agenda

Agendamentos usam `timestamptz` em UTC. A barbearia mantém um fuso IANA configurável. A constraint de exclusão GiST impede intervalos sobrepostos para o mesmo barbeiro enquanto o estado ocupa horário.

Nome, duração e preço do serviço são copiados para `appointment_services`. Relatórios históricos não mudam quando o catálogo é editado.

## Lembretes

Configurações definem canal e antecedência. Um trigger materializa lembretes por ocorrência. A chave única por agendamento, canal, tipo e horário torna o processamento idempotente. O worker usa `FOR UPDATE SKIP LOCKED`, registra cada tentativa e não desfaz o agendamento quando o provedor de e-mail falha.

Confirmação e cancelamento usam tokens aleatórios. Apenas o hash SHA-256 é armazenado; a primeira resposta invalida todos os tokens ainda ativos daquele agendamento.

## Página pública

O navegador nunca recebe `service_role`. Uma Edge Function expõe catálogo, disponibilidade e criação de reserva. A disponibilidade é calculada pelo PostgreSQL a partir de horário de trabalho, folgas, reservas ocupantes, fuso e duração do serviço. A constraint de exclusão continua sendo a proteção final contra corrida.

O cliente pode escolher um profissional específico ou “Escolher pelo horário”. Na segunda opção, a Edge Function consulta somente barbeiros ativos e habilitados para o serviço e preserva todos os profissionais livres em cada horário. A interface agrupa o horário, mostra quantos profissionais estão disponíveis e exige uma escolha explícita quando há mais de um. A reserva sempre envia o ID concreto do profissional selecionado; `any` nunca chega à função transacional de criação.

## Fotos dos profissionais

As fotos ficam no bucket público `barber-media`, pois aparecem em páginas públicas de apresentação e agendamento. Somente proprietário e gerente autenticados podem enviar ou excluir arquivos, sempre dentro do tenant e do barbeiro correspondentes. O caminho é `barber-media/{barbershop_id}/avatars/{barber_id}/{uuid}.{ext}`; nomes únicos evitam conteúdo antigo em cache e a URL pública é gravada em `barbers.avatar_url`.

O mesmo bucket já reserva a organização futura `barber-media/{barbershop_id}/portfolio/{barber_id}/` para fotos de cortes. A galeria não foi habilitada nesta etapa para não misturar foto de perfil com um recurso que ainda exigirá ordenação, legenda, moderação e limites próprios.

## Relatórios e LGPD

Views usam `security_invoker`, preservando RLS das tabelas subjacentes. Receita é estimada somente a partir de serviços registrados. Solicitações de exportação, correção e exclusão possuem estado próprio; retenção é configurável por tenant.

## Decisões autônomas

- Valores monetários em centavos inteiros para evitar erro de ponto flutuante.
- Datas em UTC e apresentação no fuso do tenant.
- Cancelamento por estado em vez de exclusão de histórico.
- WhatsApp modelado como canal desativado, permitindo inclusão futura sem remodelar a fila.
- Interface sem imagens decorativas: hierarquia, tipografia e estados carregam o produto operacional.
