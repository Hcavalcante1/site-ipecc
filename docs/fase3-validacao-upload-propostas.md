# Fase 3 — Validação upload público (propostas)

Após bucket `propostas` privado e migração para `supabasePublic` em `app/propostas/page.tsx`.

## Comportamento esperado no código

- Upload: `supabase.storage.from("propostas").upload(nome, file)` com path **sem** prefixo `public/` (`{timestamp}-{tipo}-{arquivo}`).
- Insert: `supabase.from("propostas").insert(data)` com colunas `*_url` contendo o mesmo path do upload.
- Download admin: somente via `/api/download` (não testar URL pública do storage).

## Checklist manual (staging)

1. [x] Storage: política **INSERT** para `anon` no bucket `propostas` (validado via `npm run validate:upload-proposta`, 2026-05-23).
2. [x] RLS tabela `propostas`: **INSERT** público (mesmo script — insert OK).
3. [x] Envio com PDF: `npm run validate:upload-proposta` (paridade com `supabasePublic` da página). Browser: formulário e etapa “Selecionar PDF” OK em `/propostas`; upload de arquivo no browser requer seleção manual do PDF.
4. [x] Linha + Storage: último teste `proposta_id` `1c5d4a89-8f8b-460a-a4fb-0cdf0c50502a`, path `1779498524252-proposta-staging-validacao.pdf`.
5. [x] Caminho de arquivo no storage lê OK via `downloadArquivoProposta` (passo 3 do script). API `/api/download` com sessão admin (200): conferir no browser logado.
6. [x] `npm run audit:anexos` — **0 órfãos** (10 propostas, 21 refs, 2026-05-23).
7. [x] Download anônimo: `GET /api/download/propostas/{path}` → **401**; bucket privado.

## Se INSERT falhar

- Revisar políticas no Dashboard (não alterar middleware/auth no código sem autorização).
- Conferir mensagem no alert do formulário e logs do navegador (Network → storage upload + REST insert).

## Órfãos legados

Corrigir separadamente: `docs/operacional-correcao-orfaos.md` (paths `propostas/public/...` antigos).
