-- Retira Projetos do escopo de colaboradores e restringe edição/upload ao mestre.
-- Leitura pública do site e dos arquivos públicos do bucket não é alterada.

drop policy if exists paginas_insert_authenticated on storage.objects;
drop policy if exists paginas_delete_authenticated on storage.objects;

create policy paginas_insert_mestre
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'paginas'
    and public.is_mestre_ou_admin()
  );

create policy paginas_delete_mestre
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'paginas'
    and public.is_mestre_ou_admin()
  );

update public.admin_escopos
set mod_projetos = false
where mod_projetos is distinct from false;

update public.admin_convites_propostas
set mod_projetos = false
where mod_projetos is distinct from false;
