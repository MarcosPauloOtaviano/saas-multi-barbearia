# Estratégia de testes

## Gates automatizados

- `pnpm typecheck`: tipos do frontend e integração Next.js.
- `pnpm test`: regras puras, incluindo conflito de horário.
- `pnpm lint`: regras React/Next e qualidade estática.
- `pnpm build`: compilação e pré-renderização de todas as rotas.
- `supabase test db`: testes pgTAP de isolamento e dupla reserva quando Docker/Supabase local estiver disponível.
- `supabase db lint --local --level error`: análise do banco local.

## Casos manuais críticos

1. Tenant A tenta listar, abrir por UUID, alterar e excluir dados do Tenant B.
2. Duas reservas simultâneas tentam ocupar o mesmo barbeiro e intervalo.
3. Reserva adjacente inicia exatamente quando a anterior termina.
4. Remarcação cancela lembretes antigos e agenda os novos sem duplicação.
5. Falha do Resend registra entrega falha sem cancelar o horário.
6. Token usado, expirado ou adulterado não altera o agendamento.
7. Página pública não retorna e-mail, telefone, observações ou agenda interna.
8. Layouts em 375, 390 e 414 px não exibem rolagem horizontal.
9. Controles principais permanecem utilizáveis a 200% de zoom.
10. Instalação PWA e push são validados em iPhone físico; simulação desktop não substitui esse teste.
11. Quatro barbeiros livres no mesmo horário aparecem como quatro escolhas; nenhum é atribuído sem ação do cliente.
12. Um horário com apenas um barbeiro livre pode atribuí-lo automaticamente sem permitir profissional ocupado.
13. Proprietário e gerente conseguem trocar o avatar; barbeiro e recepcionista não recebem permissão de escrita no Storage.
14. Arquivo acima de 5 MB ou fora de JPEG, PNG e WebP é rejeitado.
15. A foto atualizada aparece em Equipe, na apresentação pública e no fluxo de agendamento.

## Limite da validação desta entrega

O ambiente atual não possui Docker. As migrations anteriores tiveram sintaxe analisada por parser PostgreSQL; a migration de fotos foi revisada estruturalmente e depende de `supabase test db` ou de um projeto de staging para validação integrada do Storage. Os testes pgTAP e os advisors também exigem uma instância local ou remota configurada.
