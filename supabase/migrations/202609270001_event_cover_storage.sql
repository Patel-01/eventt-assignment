insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Event covers are publicly readable" on storage.objects;
create policy "Event covers are publicly readable"
on storage.objects for select
using (bucket_id = 'event-covers');

drop policy if exists "Users can upload their own event covers" on storage.objects;
create policy "Users can upload their own event covers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own event covers" on storage.objects;
create policy "Users can update their own event covers"
on storage.objects for update to authenticated
using (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own event covers" on storage.objects;
create policy "Users can delete their own event covers"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
