# Plano de migração — `proposta_anexos` (híbrido, sem quebra)

**Status:** planejamento · **Não aplicado** em banco nem código de produção.  
**Rascunho SQL:** `docs/sql/proposta_anexos-draft.sql`  
**Fonte de verdade atual (código):** `lib/documental/propostaPaths.ts` → colunas `*_url` em `propostas`.

---

## Objetivo

Normalizar anexos (1 linha por arquivo) mantendo **compatibilidade** com colunas legadas até corte explícito.

---

## Princípios

1. **Leitura híbrida** antes de escrita dupla.
2. **Uma PR por fase** — commits pequenos, `tsc` verde.
3. **Staging primeiro** — `audit:anexos` = 0 órfãos após cada etapa.
4. **Sem alterar UX** de `/propostas` na Fase 1 do plano.
5. **Autorização explícita** antes de SQL no Dashboard e antes de mudar `app/propostas/page.tsx`.

---

## Fases

### Fase M0 — Preparação ✅ doc

- [x] Rascunho SQL + este plano
- [x] Guia M1: `docs/M1-EXECUTAR-STAGING.md` + `docs/sql/proposta_anexos-M1-staging-APLICAR.sql`
- [x] Checagem local pré-M1 — `docs/M1-CHECAGEM-VERIFICACAO.md`
- [x] M1 fechado — 22 linhas, `verify` OK, `audit` 0 órfãos

### Fase M1 — Tabela + migração legado (somente staging)

| Ação | Onde |
|------|------|
| Criar `proposta_anexos` | Supabase staging (SQL revisado) |
| Rodar INSERT legado | `proposta_anexos-draft.sql` bloco 4 |
| Validar | `npm run audit:anexos` + UI `/admin/propostas/auditoria` |

**Código:** nenhum obrigatório na M1 (dados prontos para leitura futura).

### Fase M2 — Leitura híbrida (código, baixo risco)

| # | Ação | Status |
|---|------|--------|
| M2.1 | `lib/documental/propostaAnexosHibrido.ts` + `validar:hibrido-anexos` | ✅ |
| M2.2 | `gerarAuditoriaAnexos` com flag (default off) | pendente |
| M2.3 | API `resumo-anexos` híbrida | pendente |
| M2.4 | Admin detalhe/listagem (sem mudar visual) | pendente |

Feature flag: `USE_PROPOSTA_ANEXOS_TABLE` / `NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_TABLE` — **off** por padrão.

**Critério de pronto:** mesma lista de anexos com flag on/off em staging.

### Fase M3 — Escrita dupla (opcional, médio risco)

| Ação | Notas |
|------|-------|
| Upload público grava coluna **e** linha em `proposta_anexos` | Exige RLS INSERT público na tabela nova (decisão) |
| Admin upload idem | Sessão admin |

**Autorização obrigatória** — altera `app/propostas/page.tsx` e políticas Supabase.

### Fase M4 — Corte legado (futuro)

- Leitura só da tabela nova.
- Colunas `*_url` deprecadas (não remover fisicamente até backup).
- Script de verificação: zero divergência coluna vs tabela.

---

## Rollback

| Situação | Ação |
|----------|------|
| M1 com problema | `TRUNCATE proposta_anexos` (staging); colunas legadas intactas |
| M2 com divergência | Flag off → só colunas legadas |
| M3 com erro upload | Desligar escrita na tabela; manter só colunas |

---

## Validação obrigatória (cada fase)

```bash
npx tsc --noEmit
npm run audit:anexos
npm run validate:upload-proposta   # após M3
curl -s http://localhost:<porta>/api/health
```

Smoke manual: admin detalhe → download; anônimo → 401 em `/api/download/propostas/...`.

---

## O que não fazer sem autorização

- Aplicar SQL em produção
- Mudar middleware / auth global
- Remover colunas `*_url`
- Refatorar formulário `/propostas` por estética

---

## Próximo passo após este doc

1. Você revisa `proposta_anexos-draft.sql` (RLS e campos).
2. Autoriza **M1 em staging** ou pede ajustes no modelo.
3. Só então: PR de código M2 (leitura híbrida).
