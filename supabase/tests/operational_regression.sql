-- One statement, safe to execute through `supabase db query --file`.
-- All fixtures and changes roll back before the success notice is emitted.
do $test$
<<operational_regression>>
declare
  shop uuid := gen_random_uuid(); other_shop uuid := gen_random_uuid();
  owner_id uuid := gen_random_uuid(); staff_id uuid := gen_random_uuid(); member_id uuid := gen_random_uuid();
  professional uuid := gen_random_uuid(); colleague uuid := gen_random_uuid();
  client_id uuid := gen_random_uuid(); second_client uuid := gen_random_uuid(); service_id uuid := gen_random_uuid();
  appointment_id uuid; week jsonb; affected int; checks int := 0;
begin
 begin
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
   (owner_id,'authenticated','authenticated',owner_id::text||'@example.invalid','{}','{}'),
   (staff_id,'authenticated','authenticated',staff_id::text||'@example.invalid','{}','{}');
  insert into public.barbershops(id,name,slug) values(shop,'Verificação temporária',shop::text),(other_shop,'Verificação isolamento',other_shop::text);
  insert into public.shop_hours(barbershop_id,weekday,starts_at,ends_at,active)
    select shop,n,'09:00','18:00',true from generate_series(0,6)n
    on conflict(barbershop_id,weekday) do update set active=true;
  insert into public.memberships(barbershop_id,user_id,role,status) values(shop,owner_id,'owner','active');
  insert into public.memberships(id,barbershop_id,user_id,role,status) values(member_id,shop,staff_id,'barber','active');
  insert into public.barbers(id,barbershop_id,membership_id,display_name) values(professional,shop,member_id,'Profissional de verificação'),(colleague,shop,null,'Outro profissional');
  insert into public.clients(id,barbershop_id,name) values(client_id,shop,'Cliente de verificação'),(second_client,shop,'Outro cliente');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.services(id,barbershop_id,name,duration_minutes,price_cents) values(service_id,shop,'Serviço de verificação',30,3590);
  if (select count(*) from public.barber_services where barber_services.service_id=operational_regression.service_id and barbershop_id=shop) <> 2 then raise exception 'service assignment failed'; end if;
  checks := checks+1;
  insert into public.products(barbershop_id,name,price_cents) values(shop,'Produto de verificação',2550);
  if (select count(*) from public.products where barbershop_id=shop) <> 1 then raise exception 'product insert failed'; end if;
  checks := checks+1;
  begin
    insert into public.products(barbershop_id,name,price_cents) values(other_shop,'Forbidden',1);
    raise exception 'cross tenant insert permitted';
  exception when insufficient_privilege then checks:=checks+1; end;
  select jsonb_agg(jsonb_build_object('weekday',n,'starts_at','09:00','ends_at','18:00','active',n<>0)) into week from generate_series(0,6)n;
  perform public.save_operating_schedule(shop,professional,week);
  if (select count(*) from public.working_hours where barber_id=professional)<>7 or (select active from public.working_hours where barber_id=professional and weekday=0) then raise exception 'closed day not persisted';end if;
  checks:=checks+1;
  appointment_id:=public.create_internal_appointment(shop,service_id,professional,client_id,'2026-10-01 10:00',null);
  checks:=checks+1;
  begin
    perform public.create_internal_appointment(shop,service_id,professional,second_client,'2026-10-01 10:00',null);
    raise exception 'barber overlap allowed';
  exception when exclusion_violation then checks:=checks+1; end;
  begin
    perform public.create_internal_appointment(shop,service_id,colleague,client_id,'2026-10-01 10:00',null);
    raise exception 'client overlap allowed';
  exception when exclusion_violation then checks:=checks+1; end;
  perform public.create_internal_appointment(shop,service_id,colleague,second_client,'2026-10-01 10:00',null);
  checks:=checks+1;
  begin
    perform public.create_internal_appointment(shop,service_id,professional,client_id,'2026-10-04 10:00',null);
    raise exception 'closed professional day allowed';
  exception when check_violation then checks:=checks+1; end;
  perform public.save_operating_schedule(shop,null,week,true);
  begin
    perform public.create_internal_appointment(shop,service_id,professional,client_id,'2026-10-01 11:00',null);
    raise exception 'paused shop allowed';
  exception when check_violation then checks:=checks+1; end;
  update public.appointments set status='confirmed' where id=appointment_id;
  checks:=checks+1;
  perform public.save_operating_schedule(shop,null,week,false);
  begin
    perform public.create_internal_appointment(shop,service_id,professional,client_id,'2026-10-01 17:45',null);
    raise exception 'service crosses closing time';
  exception when check_violation then checks:=checks+1; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'role','authenticated')::text,true);
  if (select count(*) from public.appointments) <> 1 then raise exception 'staff sees foreign agenda';end if;
  checks:=checks+1;
  if (select count(*) from public.products) <> 0 then raise exception 'staff sees product administration';end if;
  checks:=checks+1;
  update public.services set price_cents=1 where id=operational_regression.service_id;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'staff changed services';end if;
  checks:=checks+1;
  begin
    perform public.save_operating_schedule(shop,null,week,true);
    raise exception 'staff changed hours';
  exception when insufficient_privilege then checks:=checks+1; end;
  perform public.set_own_barber_photo(professional,'https://example.invalid/storage/v1/object/public/barber-media/'||shop::text||'/avatars/'||professional::text||'/check.png');
  checks:=checks+1;
  begin
    perform public.set_own_barber_photo(colleague,'https://example.invalid/storage/v1/object/public/barber-media/'||shop::text||'/avatars/'||colleague::text||'/check.png');
    raise exception 'staff changed colleague photo';
  exception when insufficient_privilege then checks:=checks+1; end;
  reset role;
  if (select count(*) from public.get_public_availability(shop::text,service_id,professional,'2026-10-04'))<>0 then raise exception 'public exposes closed Sunday';end if;
  checks:=checks+1;
  raise exception using errcode='P9001',message='rollback test fixtures';
 exception when sqlstate 'P9001' then
  raise notice 'PASS: % operational checks; all fixtures rolled back',checks;
 end;
end;
$test$;
