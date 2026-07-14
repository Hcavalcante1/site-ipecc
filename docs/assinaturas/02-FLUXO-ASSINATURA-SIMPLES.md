# Fase 2 — Fluxo da Assinatura Eletrônica Simples (motor IPECC)

**Data:** 2026-07-14  
**Referências:** `00-INSPECAO-INICIAL.md`, `01-AUDITORIA-ASSINATURA-SIMPLES.md`  
**Nível:** `SIMPLE` (implícito; coluna `signature_level` ainda não migrada)

---

## 1. Objetivo

Operação rápida para documentos internos e fluxos de menor risco, com autenticação admin, OTP, carimbo visual e evidência verificável — **sem** alegar ICP-Brasil, assinatura qualificada ou assinatura avançada IPECC.

---

## 2. Fluxo feliz (documento único)

```text
usuário autenticado (módulo Documentos) + documento no escopo
→ cria pedido gd_signature_documents (provider ipecc) + signatário(s)
→ Assinar agora (AssinarNoAdminModal)
→ lê aviso “Assinatura eletrônica simples”
→ aceita consentimento (checkbox não pré-marcado)
→ POST .../ipecc/iniciar  [escopo do documento]
→ OTP por e-mail (ou contingência no painel se flag permitir)
→ confirma senha + OTP + nome/CPF/cargo + posição do selo
→ POST .../ipecc/confirmar  [escopo]
→ servidor valida auth + signatário (sequential/parallel sem fallback indevido)
→ hash SHA-256 do PDF baixado
→ carimba PDF (selo + QR /validar/{código})
→ grava path único (sem upsert) + nova versão documental
→ claim atômico do signatário (≠ already signed)
→ registra gd_signature_evidences
→ atualiza envelope/documento
→ usuário valida em /validar/{código} (re-hash; e-mail mascarado)
```

---

## 3. Lote

Auth única (senha + OTP) → loop de `confirmarAssinaturaIpecc({ skipAuth: true })` por item. Escopo de processo nas rotas de lote. Falhas parciais preservadas no progresso do lote.

---

## 4. Limitações explícitas (UI + política)

- Não é assinatura avançada IPECC.
- Não é assinatura qualificada / ICP-Brasil.
- Determinados órgãos/editais podem exigir outro método.
- OTP no painel só com `SIGNATURE_OTP_ALLOW_PANEL_FALLBACK=true` em produção.
- Rate limit ainda em memória (limitação conhecida).

---

## 5. Correções da estabilização (Etapa 3) aplicadas

| Item | Mudança |
|------|---------|
| Escopo | `carregarPedidoAssinaturaNoEscopo` em iniciar/otp/confirmar |
| Parallel | sem fallback para `pendingSigners[0]` |
| Zero signers | bloqueio em iniciar/confirmar |
| Race | claim atômico signatário + envelope; serial por max+1 |
| Storage | path com timestamp, `upsert: false` |
| OTP pepper | obrigatório em produção |
| OTP painel | gated por env |
| Rótulo | modal + `/validar` |
| PII pública | e-mail mascarado na validação |
