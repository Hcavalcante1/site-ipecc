# Fase 3 — Validação upload público (propostas)

Após bucket `propostas` privado e migração para `supabasePublic` em `app/propostas/page.tsx`.

## Comportamento esperado no código

- Upload: `supabase.storage.from("propostas").upload(nome, file)` com path **sem** prefixo `public/` (`{timestamp}-{tipo}-{arquivo}`).
- Insert: `supabase.from("propostas").insert(data)` com colunas `*_url` contendo o mesmo path do upload.
- Download admin: somente via `/api/download` (não testar URL pública do storage).

## Checklist manual (staging)

1. [ ] Storage: política **INSERT** para `anon` ou `authenticated` no bucket `propostas` (paths na raiz do bucket).
2. [ ] RLS tabela `propostas`: política **INSERT** para envio público (conforme modelo atual).
3. [ ] Enviar proposta de teste em `/propostas` (PDF principal + 1 anexo opcional).
4. [ ] Confirmar linha na tabela `propostas` e arquivos no Storage com o path gravado em `arquivo_url`.
5. [ ] Admin logado: abrir `/admin/propostas/[id]` e baixar anexo (200).
6. [ ] `npm run audit:anexos` — nova proposta sem órfãos.
7. [ ] URL direta do storage sem sessão admin → negada (bucket privado).

## Se INSERT falhar

- Revisar políticas no Dashboard (não alterar middleware/auth no código sem autorização).
- Conferir mensagem no alert do formulário e logs do navegador (Network → storage upload + REST insert).

## Órfãos legados

Corrigir separadamente: `docs/operacional-correcao-orfaos.md` (paths `propostas/public/...` antigos).
