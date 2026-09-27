create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 4 and 90),
  description text not null check (char_length(description) between 20 and 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null check (char_length(location) between 3 and 160),
  category text not null check (category in ('Music', 'Food', 'Arts', 'Community', 'Wellness', 'Technology')),
  image_url text not null,
  host_name text not null,
  host_id uuid references auth.users(id) on delete set null,
  attendee_count integer not null default 0 check (attendee_count >= 0),
  created_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at)
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_category_starts_at_idx on public.events (category, starts_at);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_rsvps_user_id_idx on public.event_rsvps (user_id);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

drop policy if exists "Anyone can browse events" on public.events;
create policy "Anyone can browse events" on public.events for select using (true);
drop policy if exists "Signed in users can create events" on public.events;
create policy "Signed in users can create events" on public.events for insert to authenticated with check (auth.uid() = host_id);
drop policy if exists "Hosts can update their events" on public.events;
create policy "Hosts can update their events" on public.events for update to authenticated using (auth.uid() = host_id) with check (auth.uid() = host_id);
drop policy if exists "Hosts can delete their events" on public.events;
create policy "Hosts can delete their events" on public.events for delete to authenticated using (auth.uid() = host_id);

drop policy if exists "Users can see their own RSVPs" on public.event_rsvps;
create policy "Users can see their own RSVPs" on public.event_rsvps for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can RSVP for themselves" on public.event_rsvps;
create policy "Users can RSVP for themselves" on public.event_rsvps for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can cancel their own RSVPs" on public.event_rsvps;
create policy "Users can cancel their own RSVPs" on public.event_rsvps for delete to authenticated using (auth.uid() = user_id);

create or replace function public.adjust_event_attendee_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT') then
    update public.events set attendee_count = attendee_count + 1 where id = new.event_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.events set attendee_count = greatest(0, attendee_count - 1) where id = old.event_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists event_rsvp_count_insert on public.event_rsvps;
create trigger event_rsvp_count_insert after insert on public.event_rsvps for each row execute function public.adjust_event_attendee_count();
drop trigger if exists event_rsvp_count_delete on public.event_rsvps;
create trigger event_rsvp_count_delete after delete on public.event_rsvps for each row execute function public.adjust_event_attendee_count();

grant usage on schema public to anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select, insert, delete on public.event_rsvps to authenticated;

insert into public.events (id, title, description, starts_at, ends_at, location, category, image_url, host_name, host_id, attendee_count)
values
  ('a1100000-0000-4000-8000-000000000001', 'Sunset Sessions: Rooftop Jazz', 'A golden-hour rooftop gathering with a live jazz trio, local pours, and a skyline view worth lingering over. Come early for the sunset; stay for the second set.', now() + interval '2 days', now() + interval '2 days 3 hours', 'The Terrace, Varanasi', 'Music', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85', 'Maya Sharma', null, 34),
  ('a1100000-0000-4000-8000-000000000002', 'The Sunday Supper Club', 'A shared table, a seasonal menu, and good conversation. Chef Nisha is cooking a five-course meal inspired by the markets of the old city. Dietary needs welcome with advance notice.', now() + interval '3 days', now() + interval '3 days 4 hours', 'Courtyard Kitchen, Assi Ghat', 'Food', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85', 'Nisha Verma', null, 18),
  ('a1100000-0000-4000-8000-000000000003', 'Clay & Chai: A Slow Morning', 'Try your hand at the potter’s wheel in a relaxed beginner workshop. We’ll shape a small cup, share fresh chai, and let the morning unfold at its own pace. All materials included.', now() + interval '4 days', now() + interval '4 days 3 hours', 'Blue Pottery Studio, Lanka', 'Arts', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1400&q=85', 'Aarav Studio', null, 11),
  ('a1100000-0000-4000-8000-000000000004', 'A Little Love for the Ganga', 'Join neighbors for a gentle morning cleanup along the riverfront. Gloves, bags, and breakfast are on us. Bring a friend, comfortable shoes, and the energy to leave the place a little better.', now() + interval '5 days', now() + interval '5 days 2 hours', 'Assi Ghat Steps', 'Community', 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1400&q=85', 'Ganga Collective', null, 42),
  ('a1100000-0000-4000-8000-000000000005', 'Morning Flow by the River', 'Find a little room to breathe with a slow, all-levels yoga flow as the city wakes up. Mats and herbal tea provided. No experience needed — just come as you are.', now() + interval '6 days', now() + interval '6 days 2 hours', 'Tulsi Ghat', 'Wellness', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=85', 'Ira Wellness', null, 26),
  ('a1100000-0000-4000-8000-000000000006', 'Builders & Breakfast', 'A no-slides meetup for people making things with AI. Bring a half-formed idea, a recent failure, or just an appetite. We’ll do short intros, then let the conversations happen naturally.', now() + interval '7 days', now() + interval '7 days 3 hours', 'The Reading Room, Sigra', 'Technology', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85', 'Pankaj Verma', null, 21)
on conflict (id) do nothing;
