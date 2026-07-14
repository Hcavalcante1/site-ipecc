# 08 — Política — Assinatura eletrônica simples

## Definição
Modalidade interna IPECC para fluxos de menor risco. Motor `ipecc` em `lib/documentos/signing/`.

## Controles
Sessão admin, consentimento, senha + OTP, carimbo visual, SHA-256 servidor, evidência, `/validar/{codigo}`.

## O que NÃO é
Não é assinatura avançada IPECC, qualificada, ICP-Brasil, nem aceitação universal.

## Uso indicado
Aprovações internas, documentos institucionais de menor risco jurídico.

## Responsabilidades
Signatário confere o documento; administrador do processo mantém escopo; IPECC opera a plataforma.
