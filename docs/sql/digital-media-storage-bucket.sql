-- Bucket privado para mídia escolhida pelo admin (Digital).
-- Upload via API admin (service role). URLs assinadas para o worker.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digital-media',
  'digital-media',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE storage.buckets IS
  'digital-media: biblioteca de mídia do módulo Digital (privado).';
