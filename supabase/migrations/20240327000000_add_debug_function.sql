-- Create a function to debug date formats
create or replace function debug_dates()
returns table (
  booking_id text,
  start_date_raw timestamp with time zone,
  start_date_date date,
  start_date_text text
)
language sql
security definer
as $$
  select 
    booking_id,
    start_date as start_date_raw,
    start_date::date as start_date_date,
    start_date::text as start_date_text
  from bookings
  where start_date is not null
  order by start_date desc
  limit 10;
$$; 