-- Add phone verification fields to profiles table
alter table public.profiles
add column if not exists phone_number text,
add column if not exists phone_verified boolean default false,
add column if not exists phone_verified_at timestamp with time zone; 