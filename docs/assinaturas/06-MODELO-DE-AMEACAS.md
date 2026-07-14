# 06 — Modelo de ameaças (Assinaturas IPECC)

## Ativos
Documento, identidade, evidências, chaves Ed25519, códigos de validação, sessão admin.

## Ameacas e mitigações

| Ameaça | Simples | Avançada |
|--------|---------|----------|
| Assinar fora do escopo | Escopo nas rotas ipecc | Escopo + só signatário |
| Admin assina por terceiro | Parcial (mesmo admin) | **Proibido** (actor = signer) |
| Replay OTP/MFA | consumed_at | challenge CONSUMED uso único |
| Manipular hash no client | Hash servidor | Hash servidor + freeze |
| Alterar PDF após assinar | Re-hash em /validar | Re-hash + selo manifesto |
| Alterar evidências | Service role; append lógico | Trigger anti-UPDATE/DELETE |
| Enumeração de códigos | Rate limit memória | Idem + 48-bit codes |
| Vazamento CPF | PDF + admin | Hash + last4 na identidade; PDF carimbo ainda usa CPF informado |
| Chave privada exposta | N/A | Só env; nunca DB/client |
| Lista de lote alterada | Itens simples | batch_hash_sha256 |

## Residual
Rate limit in-memory; OTP painel com flag; ausência de HSM; identidade HIGH/biometria não implementada.
