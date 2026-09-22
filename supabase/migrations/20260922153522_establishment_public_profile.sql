-- Public contact details for each establishment. These fields stay tenant
-- scoped so every barbershop can publish its own address and channels.
alter table public.barbershops
  add column if not exists address text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists google_reviews_url text,
  add column if not exists google_review_count integer;

alter table public.barbershops
  drop constraint if exists barbershops_website_url_https_check;

alter table public.barbershops
  add constraint barbershops_website_url_https_check
  check (website_url is null or website_url ~ '^https://');

alter table public.barbershops
  drop constraint if exists barbershops_google_review_count_check;

alter table public.barbershops
  add constraint barbershops_google_review_count_check
  check (google_review_count is null or google_review_count >= 0);

-- Stilo Sampa — the only production tenant currently configured.
update public.barbershops
set name = 'Stilo Sampa',
    phone = '(35) 99743-2871',
    address = 'Av. Pres. Tancredo Neves, 360A - Jardim Três Rosas, Guaxupé - MG, 37800-000',
    website_url = 'https://bit.ly/StiloSampa',
    instagram_url = 'https://www.instagram.com/explore/locations/1008666412/stilo-sampa-guaxupe/',
    google_reviews_url = 'https://www.google.com/search?q=Stilo+Sampa+Guaxup%C3%A9',
    google_review_count = 48
where slug = 'stilo-sampa';
