# 16 — Assinatura com certificado digital (PFX local)

## Objetivo
Permitir assinar 1 ou N PDFs com certificado `.pfx`/`.p12` do computador do signatário, **sem enviar a chave privada** ao servidor.

## Fluxo
1. Admin importa `.pfx` + senha no navegador.
2. Escolhe página (e opcionalmente por documento) da aparência visual.
3. Servidor cria sessão (congela hash dos originais).
4. Cliente baixa cada PDF, carimba, gera PKCS#7 detached, anexa `.p7s` e envia só o PDF assinado + metadados públicos.
5. `/validar/{codigo}` exibe modalidade CERTIFICATE.
6. Opcionalmente, o `.pfx` pode ser salvo criptografado no cofre da plataforma para reuso posterior.

## O que sobe ao servidor
- PDF já assinado/carimbado
- PKCS#7 (opcional, evidência)
- subject, issuer, serial, validade, thumbprint SHA-256
- `.pfx` criptografado no cofre da plataforma, se o operador optar por salvar

## O que NÃO sobe
- Arquivo `.pfx`/`.p12`
- Senha do certificado
- Chave privada

## Telas
- Assinaturas (1 doc)
- Ficha do documento (`?cert=1`)
- Lotes (vários IDs)

## SQL
`docs/sql/gestao-documental-assinatura-certificado.sql` — aplicar no Supabase.

## Limitações
- Não alegar automaticamente ICP-Brasil válida sem cadeia/CRL.
- Aparência visual + PKCS#7 embutido; validação nativa completa no Adobe depende do certificado/cadeia.
- Limite de 20 documentos por sessão.
