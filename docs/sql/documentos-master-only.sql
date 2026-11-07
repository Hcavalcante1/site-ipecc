-- Gestão Documental exclusiva do administrador mestre.
-- Remove concessões antigas e convites pendentes que continham o módulo.
UPDATE public.admin_escopos
SET mod_documentos = false
WHERE mod_documentos IS DISTINCT FROM false;

UPDATE public.admin_convites_propostas
SET mod_documentos = false
WHERE mod_documentos IS DISTINCT FROM false;
