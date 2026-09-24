-- Expose only the public identity and contact fields needed by the tenant
-- storefront. The function resolves the tenant from its slug and never
-- returns administrative settings or customer data.
create or replace function public.get_public_shop_profile(target_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  timezone text,
  phone text,
  address text,
  website_url text,
  instagram_url text,
  google_reviews_url text,
  google_review_count integer,
  logo_url text,
  primary_color text,
  accent_color text,
  booking_message text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    shop.id,
    shop.name,
    shop.slug,
    shop.timezone,
    shop.phone,
    shop.address,
    shop.website_url,
    shop.instagram_url,
    shop.google_reviews_url,
    shop.google_review_count,
    shop.logo_url,
    shop.primary_color,
    shop.accent_color,
    shop.booking_message
  from public.barbershops shop
  where shop.slug = target_slug
    and shop.active
    and shop.public_booking_enabled;
$$;

revoke all on function public.get_public_shop_profile(text) from public;
grant execute on function public.get_public_shop_profile(text) to anon, authenticated, service_role;
