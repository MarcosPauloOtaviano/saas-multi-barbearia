# Segundo cérebro — estado de produção do BarberFlow

Data: 24 de setembro de 2026

## Decisões permanentes

- O BarberFlow é multiestabelecimento. Cada barbearia tem dados, equipe, serviços, horários, agenda e administrador isolados pelo `barbershop_id`.
- O cliente da Stilo Sampa entra por `/stilo-sampa` e agenda sem criar conta.
- A equipe entra por `/admin`. Depois da identificação, o sistema encaminha cada pessoa ao estabelecimento correto.
- Mantena é proprietário, administrador e barbeiro da Stilo Sampa. Ele pode administrar toda a operação do estabelecimento e também receber agendamentos.
- Roberto é barbeiro da Stilo Sampa e não é administrador. Seu login só deve ser liberado quando Mantena definir as credenciais iniciais no painel.
- O cliente pode escolher um profissional específico ou “Primeiro disponível”. A disponibilidade nunca pode permitir conflito de profissional nem reserva duplicada.

## Estado confirmado na produção

- Projeto Supabase: `cbccvccqabrvjpeiomrf`.
- Stilo Sampa: 2 barbeiros ativos, Mantena e Roberto.
- Roberto recebeu os 13 serviços ativos e jornada de segunda a sábado, das 09:00 às 18:00; domingo permanece fechado.
- Mantena usa o identificador de acesso `mantena@stilosampa`. Senhas não são documentadas neste arquivo.
- O perfil público contém telefone, endereço, Instagram, site e referência das avaliações do Google da Stilo Sampa.
- O catálogo público retorna os profissionais e serviços reais do banco.
- A conclusão automática de atendimentos vencidos está ativa no banco e roda a cada minuto.
- Depois do horário final, o atendimento é concluído automaticamente; a equipe ainda pode registrá-lo como não realizado. Não é permitido concluir antecipadamente um atendimento futuro.

## Melhorias aplicadas nesta revisão

- Criada a função pública segura `get_public_shop_profile`, que expõe somente os dados institucionais necessários da barbearia.
- A página pública deixou de depender de textos fixos da Stilo Sampa e passou a respeitar o nome do estabelecimento atual.
- Links de notificações foram normalizados para sempre abrir o painel do estabelecimento autenticado.
- Alertas do navegador agora levam à solicitação correta e deixam explícito quando funcionam somente com o painel aberto.
- Métricas de clientes passaram a usar os agendamentos reais: visitas concluídas, última visita, próxima visita e intervalo médio de retorno.
- Relatórios ganharam seleção funcional entre mês atual e todo o histórico.
- Ações de clientes agora abrem e-mail, WhatsApp ou a agenda já com o cliente selecionado.
- A remoção da foto do próprio perfil foi liberada com segurança.
- O painel inicial agora tem a Central de avisos com duas abas: “Novos agendamentos”, para pedidos pendentes com atalho direto para a agenda, e “Avisos”, para confirmações, cancelamentos e retornos. A atualização continua vindo do Realtime e da atualização periódica do painel.

## Infraestrutura e segurança

- A barreira contra dupla reserva permanece no PostgreSQL, além da validação de disponibilidade da função pública.
- O ID idempotente de solicitação continua protegendo contra clique duplo e repetição de rede.
- As migrations de ciclo de atendimento, perfil público, remoção de foto e RPC pública foram aplicadas diretamente no SQL Editor do projeto conectado.
- O histórico da CLI de migrations ainda deve ser reconciliado antes de uma futura execução automática de `db push`; o schema funcional de produção já contém as alterações.

## Dependências externas ainda necessárias

- E-mail transacional: falta configurar no Supabase uma chave válida do Resend e um remetente de domínio verificado. Sem isso, o agendamento é salvo, mas e-mails e lembretes registram falha de provedor.
- Notificação em segundo plano: os alertas atuais usam som e notificação do navegador enquanto o painel está aberto. Push com o aplicativo fechado exige chaves VAPID e inscrição real do dispositivo.

## Regra de manutenção

Antes de publicar mudanças de banco, conferir o schema real de produção e o histórico da CLI. Nunca inserir chaves privilegiadas, senhas de equipe ou tokens neste repositório.
