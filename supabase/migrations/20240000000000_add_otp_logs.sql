-- Create OTP logs table
create table if not exists public.otp_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    event_type text,
    phone_number text,
    status text,
    raw_data jsonb,
    processed boolean default false
);

-- Set up RLS policies
alter table public.otp_logs enable row level security;

-- Allow insert from webhook (no auth required)
create policy "Allow webhook inserts"
on public.otp_logs for insert
to public
with check (true);

-- Only allow admins to view logs
create policy "Allow admins to view logs"
on public.otp_logs for select
to authenticated
using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
); 