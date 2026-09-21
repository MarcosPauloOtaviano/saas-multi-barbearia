-- The shop owner can also take appointments. Keep the authorization role on
-- memberships (owner) while linking a professional profile for the agenda.
insert into public.barbers (barbershop_id, membership_id, display_name, color, active)
select m.barbershop_id, m.id, coalesce(nullif(trim(p.full_name), ''), 'Mantena'), '#c86f45', true
from public.memberships m
left join public.profiles p on p.id = m.user_id
join public.barbershops s on s.id = m.barbershop_id
where s.slug = 'stilo-sampa'
  and m.role = 'owner'
  and m.status = 'active'
on conflict (barbershop_id, membership_id) do update
set display_name = excluded.display_name,
    color = excluded.color,
    active = true,
    updated_at = now();
