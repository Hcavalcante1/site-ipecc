# Fase 5 — Modelo de dados (Assinatura Avançada)

**SQL:** `docs/sql/gestao-documental-assinatura-avancada.sql`  
**Rollback:** não executar DROP; para reverter, não usar as tabelas `gd_adv_*` e remover colunas `signature_level` apenas com migração dedicada futura.

## Alterações additive no simples

| Objeto | Mudança |
|--------|---------|
| `gd_signature_documents.signature_level` | DEFAULT `LEGACY_SIMPLE`; check SIMPLE/ADVANCED/LEGACY_SIMPLE |
| `gd_signature_evidences.signature_level` | DEFAULT `LEGACY_SIMPLE`; app grava `SIMPLE` em novas |

## Tabelas novas

| Tabela | Função |
|--------|--------|
| `gd_adv_key_versions` | Chaves públicas do sistema (Ed25519); privada nunca no DB |
| `gd_adv_policies` | Textos de consentimento versionados |
| `gd_adv_identity_verifications` | Habilitação do signatário (CPF só hash + last4) |
| `gd_adv_batches` / `gd_adv_batch_items` | Lote avançado (estrutura pronta; UI lote na etapa 14) |
| `gd_adv_transactions` | Transação avançada |
| `gd_adv_consents` | Consentimentos expressos |
| `gd_adv_auth_challenges` | Desafios uso único / anti-replay |
| `gd_adv_events` | Auditoria append-only + trigger anti-UPDATE/DELETE |
| `gd_adv_artifacts` | Artefatos imutáveis + trigger |

## RLS

Todas com `ENABLE ROW LEVEL SECURITY` e **sem** policies para `anon`/`authenticated` → acesso somente via service role nas APIs server-side (padrão do módulo documental).

## Constraints relevantes

- Unique `verification_code` em transações concluídas
- Unique `(signer_user_id, idempotency_key)`
- Unique parcial CPF hash ativo
- Unique `(transaction_id, artifact_type)`
- Uma chave `active` por vez

## Storage

```text
advanced/{processo|geral}/{documentId}/{transactionId}/
  signed.pdf
  evidence-certificate.pdf
  evidence.json
  signed-manifest.json
advanced/{processo|geral}/{documentId}/{ts}-original.pdf
```

Nunca sobrescrever (`upsert: false`).
