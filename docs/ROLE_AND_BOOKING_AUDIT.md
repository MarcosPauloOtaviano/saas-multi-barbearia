# Auditoria de perfis e agendamento — Stilo Sampa

Data: 20 de setembro de 2026

## Decisão de produto

O cliente agenda sem criar conta. O fluxo pede serviço, profissional e horário antes de solicitar nome e e-mail. O e-mail recebe um link de uso único para confirmar ou cancelar o agendamento. Uma conta de cliente pode ser oferecida futuramente como conveniência, nunca como requisito.

Cada pessoa da equipe usa uma conta própria. O proprietário ou gerente envia um convite por e-mail e escolhe a função. O acesso permanece pendente até o convidado abrir o link. Senhas não são criadas nem compartilhadas pelo administrador.

## Comparação com o InBarber usado atualmente

URL auditada: `https://chat.inbarberapp.com/?id=4dce930f-2334-461a-bbb3-1679e9867906`

O teste foi somente leitura para não criar uma reserva real. A primeira tela do InBarber apresenta uma assistente virtual e exige nome e sobrenome antes de exibir serviços ou horários.

Pontos positivos:

- linguagem simples e conversacional;
- página leve, com foco em uma pergunta por vez;
- não exige criar senha ou conta antes do agendamento.

Pontos negativos:

- pede dado pessoal antes de entregar valor ao cliente;
- não permite comparar serviços, preços, profissionais e horários na primeira interação;
- o formato de conversa torna mais lenta a revisão de escolhas anteriores;
- a etapa inicial não explica como os dados serão usados;
- o fluxo não mostra, na primeira tela, uma estratégia clara contra clique duplo ou reservas simultâneas.

## Fluxos testados

1. Cliente — saudável
   - abriu a home da Stilo Sampa em 375, 390 e 414 px;
   - visualizou próximo horário, serviços favoritos, equipe e chamada principal;
   - percorreu serviço → primeiro disponível → data/horário → dados;
   - confirmou que os dados aparecem somente na etapa final;
   - não enviou reserva externa nem concluiu uma reserva real.

2. Administrador — saudável
   - visualizou toda a operação, clientes, serviços, equipe, relatórios e ajustes;
   - abriu o módulo Equipe;
   - criou um convite de demonstração para um barbeiro;
   - confirmou o estado “Convite enviado” e a criação do profissional sem senha compartilhada.

3. Barbeiro — saudável
   - alternou para o perfil de Leonardo Lima;
   - confirmou navegação reduzida a Início, Agenda e Avisos;
   - confirmou dashboard limitado a três atendimentos do próprio profissional;
   - tentou abrir Equipe e recebeu bloqueio de acesso;
   - confirmou que alertas de retorno e dados de outros profissionais não aparecem.

4. Segurança e duplicidade — saudável no código e no parser SQL
   - exclusão temporal existente continua bloqueando dois atendimentos simultâneos do mesmo barbeiro;
   - nova exclusão temporal bloqueia o mesmo cliente em dois barbeiros no mesmo intervalo;
   - `booking_request_id` torna reenvios do mesmo pedido idempotentes;
   - bloqueio transacional por identidade evita clientes duplicados em requisições concorrentes;
   - e-mail e telefone são normalizados antes da busca;
   - testes pgTAP cobrem isolamento entre barbearias e entre barbeiros.

5. Seleção de profissional e múltiplas barbearias — saudável
   - escolha manual exibe apenas profissionais ativos e habilitados para o serviço;
   - “Primeiro disponível” não fixa mais o primeiro nome da lista: cada horário é associado a um barbeiro realmente livre;
   - cenário automatizado Mantena ocupado às 15h / Roberto livre às 15h seleciona Roberto;
   - o horário ocupado desaparece quando o cliente escolhe Mantena especificamente;
   - `/b/stilo-sampa` e `/b/salao-dos-cobras` usam a mesma aplicação com identidade e dados separados por slug/tenant;
   - o nome real configurado no tenant substitui o nome inferido assim que o catálogo público é carregado;
   - o link da marca permanece dentro da própria barbearia, sem retornar à Stilo Sampa.

6. Quatro profissionais no mesmo horário e fotos de perfil — saudável
   - “Escolher pelo horário” mostra cada horário uma vez e informa quantos profissionais estão livres;
   - ao abrir um horário com vários profissionais, todos aparecem com nome e foto e o avanço permanece bloqueado até a escolha;
   - cenário automatizado com quatro barbeiros livres às 15h retorna os quatro, sem deduplicar o horário para apenas um nome;
   - o teste no navegador confirmou três profissionais livres às 16h30, escolha explícita de Leonardo e liberação da próxima etapa somente depois da seleção;
   - proprietário e gerente veem o controle de foto no módulo Equipe;
   - avatares aparecem também na home pública e no agendamento, com iniciais quando não há imagem;
   - upload aceita JPEG, PNG e WebP até 5 MB; no modo conectado usa Storage e, no modo demonstração, mantém uma prévia somente durante a sessão.

## Permissões aplicadas

- Proprietário: acesso total e convite de gerente, barbeiro ou recepcionista.
- Gerente: operação completa e convite de barbeiro ou recepcionista.
- Recepcionista: agenda e clientes, sem relatórios, equipe ou ajustes.
- Barbeiro: própria agenda, clientes ligados aos próprios atendimentos e avisos relacionados.
- Cliente: sem sessão obrigatória; somente o agendamento associado ao link seguro.

## Implementação principal

- Edge Function `invite-team-member` para convite autenticado e criação transacional de perfil, vínculo e barbeiro.
- RPC `accept_team_invitation()` para ativar o acesso depois do callback autenticado.
- RLS por função no banco, incluindo restrição por `barbers.membership_id`.
- política de perfil de equipe visível somente para proprietário/gerente da mesma barbearia.
- formulário de convite com função, e-mail e cor da agenda.
- seletor de perfil somente no modo demonstração para revisão rápida.
- fluxo público renomeado para `stilo-sampa` e sem cadastro obrigatório.
- disponibilidade pública sem deduplicação de profissionais no mesmo horário e seletor obrigatório após a escolha do horário.
- componente reutilizável de avatar e bucket `barber-media` protegido para fotos de perfil.

## Limites do teste

O stack Supabase local não foi iniciado porque o ambiente não disponibiliza Docker. As migrations anteriores e o teste pgTAP foram validados sintaticamente com parser PostgreSQL; a migration de fotos recebeu revisão estrutural e ainda deve passar no staging ou no stack local antes da implantação. A aplicação passou por typecheck, sete testes unitários, lint, build de produção, fluxo de navegador e checagem isolada da Edge Function pública. O envio real de e-mail de convite requer `SITE_URL`, SMTP e as chaves do projeto Supabase configurados no ambiente de implantação.
