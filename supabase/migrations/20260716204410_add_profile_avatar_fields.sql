alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_public_id text;

alter table public.profiles
  drop constraint if exists profiles_avatar_url_cloudinary;

alter table public.profiles
  add constraint profiles_avatar_url_cloudinary
  check (
    avatar_url is null
    or avatar_url like 'https://res.cloudinary.com/%'
  );
