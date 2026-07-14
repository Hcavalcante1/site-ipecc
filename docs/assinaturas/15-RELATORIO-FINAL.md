# 15 — Relatório final — Assinatura Simples + Avançada IPECC

**Data:** 2026-07-14  
**Escopo:** base interna (não produto SaaS IPECC Sign)

## Arquitetura anterior
Motor único `ipecc` (senha + OTP + carimbo + evidência) sem classificação formal de nível; adapters Documenso/gov.br latentes.

## Arquitetura final
```text
Gestão documental compartilhada
├── Assinatura Simples (lib/documentos/signing) — PRESERVADA
└── Assinatura Avançada (lib/documentos/assinaturas/advanced) — NOVA
    identidade · consentimento · MFA · freeze · manifesto Ed25519
    · auditoria append-only · certificado · lote · /validar
```

## Arquivos criados (principais)
- `docs/assinaturas/00`–`15`
- `docs/sql/gestao-documental-assinatura-avancada.sql`
- `lib/documentos/assinaturas/**`
- APIs `assinaturas-avancadas`, `identidade-avancada`, `lotes-avancados`
- UI `AssinarAvancadaModal`, `AssinarLoteAvancadoModal`
- `scripts/validar-assinaturas-modulo.ts`

## Arquivos alterados (principais)
- Rotas ipecc (escopo, race, OTP)
- `validationService` / `/validar` / download
- `AssinaturasClient`, `lotes/page`

## Tabelas novas
`gd_adv_key_versions`, `gd_adv_policies`, `gd_adv_identity_verifications`, `gd_adv_batches`, `gd_adv_batch_items`, `gd_adv_transactions`, `gd_adv_consents`, `gd_adv_auth_challenges`, `gd_adv_events`, `gd_adv_artifacts`  
Colunas `signature_level` em documentos/evidências simples (default `LEGACY_SIMPLE`).

## Migrações
Additive; rollback = não usar tabelas `gd_adv_*` (sem DROP obrigatório).

## Testes
- Typecheck TypeScript  
- `npm run validar:assinaturas` (estrutural)  
- Testes manuais: ver `07-PLANO-DE-TESTES.md`

## Riscos corrigidos
Escopo nas rotas simples; race signatário; parallel frágil; zero signers; pepper prod; OTP painel gated; rótulos SIMPLE; e-mail público mascarado; avançada com anti-terceiro.

## Riscos residuais
Rate limit memória; identidade BASIC auto-habilitada no admin; CPF no carimbo PDF; chave Ed25519 depende de env (sem HSM); SQL precisa ser aplicado manualmente no Supabase.

## Limitações
Sem SaaS, cobrança, white-label, API comercial, ICP-Brasil, GOV.BR obrigatório, biometria, passkey nativa.

## Estado dos módulos
| Módulo | Estado |
|--------|--------|
| Simples | Operacional / preservado |
| Avançada 1 doc | Implementada |
| Lote avançado | Implementada |
| Documentação 00–15 | Concluída |

## Prontidão para produção
**Condicional:** aplicar SQLs + envs (`SIGNATURE_ADV_PRIVATE_KEY_PEM`, pepper, Resend) + smoke manual. Revisão jurídica recomendada antes de uso com efeitos externos.

## Itens futuros — IPECC Sign
Basic → Advanced → Qualified (ICP) → Enterprise (API/multiempresa). Somente após estabilidade, auditoria e autorização formal.

## Commits relevantes desta iniciativa
Ver histórico `docs(assinaturas)`, `fix(documentos): estabiliza assinatura simples`, `feat(documentos): contratos`, `feat(documentos): módulo de assinatura avançada` e commit de finalização do lote/docs.
