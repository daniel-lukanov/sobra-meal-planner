-- Public bucket for recipe photos (the recipe.image_url column stores the public URL or path).
-- Anyone can read an object by its URL; nobody can write or list with the public key.
-- Uploads go through the secret key from a script or server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
