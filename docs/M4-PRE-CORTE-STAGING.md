# M4 — Pré-corte em staging (read-only)

## Objetivo

Confirmar que **todas** as referências em colunas `*_url` existem em `proposta_anexos` antes de ativar leitura só da tabela.

## Comandos

```bash
npm run sync:proposta-anexos    # se houver gap após testes
npm run validar:pre-m4-corte
npm run audit:anexos            # 0 órfãos
npm run verify:proposta-anexos
```

## Flags M4 (não ativar em produção sem autorização)

```env
# Passo futuro — somente após validar:pre-m4-corte OK
USE_PROPOSTA_ANEXOS_SOMENTE_TABELA=true
NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_SOMENTE_TABELA=true
```

Com `SOMENTE_TABELA`, o código ignora colunas `*_url` na leitura (colunas permanecem no banco).

## Rollback M4

Desligar `USE_PROPOSTA_ANEXOS_SOMENTE_TABELA` → volta ao híbrido ou legado conforme flags M2.
