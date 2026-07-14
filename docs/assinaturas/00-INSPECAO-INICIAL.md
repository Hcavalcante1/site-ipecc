# Fase 0 — Inspeção inicial do repositório

**Data:** 2026-07-14  
**Escopo:** preparar a base documental para Assinatura Simples (módulo atual) + Assinatura Avançada (módulo novo), sem implementação ainda nesta fase.  
**Projeto:** IPECC — Gestão Documental (`gd_*`)  
**Classificação do módulo atual:** Assinatura Eletrônica **SIMPLES** (a preservar).

---

## 1. Stack

| Item | Valor |
|------|--------|
| Framework | Next.js `^14.2.10` |
| Router | **App Router** (`app/`) |
| UI | React `18.2.0` |
| Linguagem | TypeScript `5.4.5` |
| Auth / DB / Storage | Supabase (`@supabase/ssr` `0.8.0`, `@supabase/supabase-js` `2.90.1`, auth-helpers) |
| PDF (carimbo / escrita) | `pdf-lib` `^1.17.1` |
| PDF (prévia modal) | `pdfjs-dist` `^4.10.38` |
| Imagem / logo no selo | `sharp` `^0.34.5` |
| QR Code | `qrcode` `^1.5.4` |
| E-mail OTP | Resend `^6.12.2` |
| JWT util | `jose` (uso geral; não é ICP) |
| Produção | Vercel a partir do remote `site-ipecc` |

Não há suite de testes unitários dedicada ao motor de assinatura; validação operacional via scripts (`npm run validar:documentos`, smoke admin, etc.).

---

## 2. Estrutura relevante (diretórios)

```text
app/
  admin/documentos/          # UI Gestão Documental (assinaturas, lotes, auditoria)
  api/admin/documentos/      # APIs admin (ipecc/iniciar|otp|confirmar, lotes, evidências)
  api/public/validar/        # API pública de validação
  api/download/assinatura/   # Download do PDF assinado por código
  validar/[codigo]/         # Página pública de verificação
lib/documentos/
  signing/                   # Motor IPECC atual (= SIMPLES)
  signature/                 # Adapters de provedor (Ipecc, Documento, GovBr, Documenso)
docs/
  gestao-documental-assinatura-ipecc.md
  sql/gestao-documental-assinatura-ipecc.sql
  sql/gestao-documental-fase-*.sql
  assinaturas/               # Nova pasta desta iniciativa (este documento)
public/media/global/logos/   # Logo IPECC usado no selo
```

---

## 3. Módulo localizado (assinatura atual = SIMPLES)

### 3.1 Motor de assinatura (`lib/documentos/signing/`)

| Arquivo | Função |
|---------|--------|
| `ipeccSignService.ts` | Iniciar (consentimento + OTP) e confirmar (senha + OTP + carimbo + evidência) |
| `batchSignService.ts` | Assinatura em lote (1 auth → N documentos) |
| `otpService.ts` | Geração/consumo OTP (hash + pepper), envio Resend |
| `passwordConfirm.ts` | Reautenticação por senha no confirmar |
| `pdfStampService.ts` | Aplicação do selo visual no PDF (`pdf-lib` + `sharp` + QR) |
| `evidenceService.ts` | Código de validação, serial, SHA-256 servidor, persistência de evidências |
| `validationService.ts` | Lookup público por código |
| `laudoService.ts` | Laudo textual / CSV de evidências |
| `rateLimit.ts` | Rate limit em memória (processo) |
| `constants.ts` | Consentimento, provider `ipecc`, tipos de evidência, URL base |

### 3.2 Adapters (`lib/documentos/signature/`)

| Arquivo | Observação |
|---------|------------|
| `IpeccProvider.ts` | Provedor ativo / padrão |
| `DocumentoProvider.ts` | Legado / alternativo |
| `GovBrProvider.ts` | Stub / futuro (não é assinatura avançada desta fase) |
| `DocumensoProvider.ts` | Integração SaaS desativada no fluxo operacional atual |
| `SignatureProvider.ts` / `index.ts` | Contratos / factory (`ipecc` padrão) |

**Decisão arquitetural:** o motor `signing/*` + provider `ipecc` = **Assinatura Simples**. Não será apagado nem renomeado como “avançado”.

### 3.3 UI admin

| Caminho | Papel |
|---------|--------|
| `app/admin/documentos/assinaturas/page.tsx` | Entrada Assinaturas |
| `AssinaturasClient.tsx` | Lista / criar pedido / “Assinar agora” |
| `components/AssinarNoAdminModal.tsx` | Modal: PDF prévia (pdf.js), posicionamento do selo, consentimento, OTP, senha |
| `lotes/page.tsx` | Lotes IPECC |
| `auditoria/page.tsx` | Lista evidências + links `/validar/{codigo}` |

### 3.4 APIs admin (IPECC)

```text
POST /api/admin/documentos/assinaturas/[id]/ipecc/iniciar
POST /api/admin/documentos/assinaturas/[id]/ipecc/otp
POST /api/admin/documentos/assinaturas/[id]/ipecc/confirmar
(+ equivalentes em /lotes/[id]/ipecc/…)
GET  /api/admin/documentos/evidencias
GET  /api/admin/documentos/evidencias/[id]/laudo
```

Outras rotas (`enviar`, `assinar`, callback Documenso etc.) coexistimento legado — auditar na Fase 1 para não quebrar.

### 3.5 Público (verificação)

| Rota | Papel |
|------|--------|
| `/validar/[codigo]` | Página pública |
| `/api/public/validar/[codigo]` | JSON de validação |
| `/api/download/assinatura/[codigo]` | Download do PDF assinado |

---

## 4. Banco de dados (Supabase)

Script principal do motor IPECC:

- `docs/sql/gestao-documental-assinatura-ipecc.sql`

Tabelas / artefatos observados (base + IPECC):

| Objeto | Uso |
|--------|-----|
| `gd_signature_providers` | Provedores; `ipecc` ativo; defaults em documents/batches |
| `gd_signature_documents` | Pedido/envelope; `validation_code`, `stamped_version_id`, `signing_mode` |
| `gd_signature_signers` | Signatários (cargo, invite, etc.) |
| `gd_signature_batches` / `gd_signature_batch_items` | Lotes |
| `gd_signature_otp_challenges` | OTP (código só em hash); RLS habilitado |
| `gd_signature_evidences` | Evidências pós-assinatura (hashes, IP, UA, consentimento, etc.) |
| `gd_validation_lookups` | Lookups / métricas de validação pública |
| `gd_document_versions` | Versões de documento (incl. stamped) |
| Docs base `gd_documents`, storage paths, logs | Gestão documental compartilhada |

**Ainda não existem** (planejados para Assinatura Avançada): `signature_transactions` genéricas da especificação mestre, manifesto Ed25519, cadeia append-only formal `signature_events`, tabela de identidade VERIFIED/HIGH, certificado de evidências PDF dedicado, etc.

**Classificação retroativa prevista:** registros atuais do motor IPECC → `SIMPLE` ou `LEGACY_SIMPLE` (definir na migração do modelo avançado sem alterar validação antiga).

---

## 5. Storage

| Item | Valor |
|------|--------|
| Bucket | `gestao-documental` (constante `GD_STORAGE_BUCKET`) |
| Acesso | Paths resolvidos no servidor; download via APIs (não path cru do cliente) |
| Artefatos simples | PDF original (versão) + PDF carimbado / `signed_storage_path` |

Estrutura futura sugerida no prompt mestre (`documents/simple/...`, `documents/advanced/...`) **ainda não** está padronizada como árvore de produto; a Fase 3 adaptará sem reorganizar todo o bucket desnecessariamente.

---

## 6. Autenticação, middleware e autorizações

- Sessão admin via Supabase SSR (padrão do projeto).
- Rotas `/api/admin/documentos/.../ipecc/*` exigem usuário autenticado no painel (server-side).
- Confirmação de assinatura exige **senha** (`passwordConfirm`) + **OTP** (desafio com expiração e `max_attempts`).
- **Middleware:** não alterar nesta iniciativa sem autorização explícita (regra do projeto).
- **Auth/rotas públicas:** `/validar/*` permanece pública; alterações de comportamento só com cuidado e documentação.
- Operações de escrita usam frequentemente `getSupabaseAdmin()` (service role) no servidor — ponto de auditoria de segurança na Fase 1.

---

## 7. Fluxo operacional atual (visão resumida)

```text
documento preparado (gd_documents + versão)
→ pedido gd_signature_documents (provider ipecc)
→ Assinar agora (modal)
→ consentimento (checkbox não pré-marcado no fluxo documentado)
→ OTP (e-mail / fallback painel se Resend falhar)
→ confirmação senha + OTP
→ servidor: hash SHA-256 do PDF, carimbo visual, upload, evidência, validation_code
→ status signed
→ QR / link /validar/{codigo}
```

Detalhamento etapa a etapa (arquivos, riscos, classificação EXISTENTE/INSEGURO) → **Fase 1** (`01-AUDITORIA-ASSINATURA-SIMPLES.md`).

---

## 8. Dependências e bibliotecas criptográficas

| Biblioteca | Uso atual |
|------------|-----------|
| Node `crypto` (via `evidenceService` / OTP) | SHA-256 de bytes no **servidor**; hash OTP |
| `jose` | JWT geral do app; não selar manifesto avançado ainda |
| Ausente nesta fase | Ed25519/ECDSA dedicado a manifesto IPECC Avançada, WebAuthn/passkeys obrigatórios |

---

## 9. Variáveis de ambiente (assinatura)

Documentadas em `docs/gestao-documental-assinatura-ipecc.md`:

- `RESEND_API_KEY`, `RESEND_FROM` / `EMAIL_FROM`, fallbacks `EMAIL_ADMIN` / `EMAIL_CONTATO`
- `SIGNATURE_OTP_PEPPER` (opcional)
- `SIGNATURE_VALIDATION_BASE_URL` (opcional; senão `NEXT_PUBLIC_SITE_URL` / `APP_URL`)
- Credenciais Supabase (padrão do projeto; service role só server-side)

**Não** hardcodar chave privada de selo avançado no código (fase futura).

---

## 10. Logs e observabilidade

- `registrarLog` / notificações documentais em `documentsService` / `notificationsService`
- Auditoria UI: `/admin/documentos/auditoria`
- Rate limit: memória por processo (`rateLimit.ts`) — limitado em multi-instância Vercel
- Lookups públicos: `gd_validation_lookups`

---

## 11. Pontos de entrada (checklist rápido)

1. UI: `/admin/documentos/assinaturas` → Assinar agora  
2. UI lote: `/admin/documentos/lotes`  
3. APIs `.../ipecc/iniciar` → `otp` → `confirmar`  
4. Público: `/validar/{codigo}`  
5. SQL: `docs/sql/gestao-documental-assinatura-ipecc.sql`  
6. Doc operacional legado: `docs/gestao-documental-assinatura-ipecc.md`

---

## 12. Riscos iniciais (pré-auditoria)

Classificação preliminar — a Fase 1 confirma no código/DB:

| Risco | Severidade estimada | Nota |
|-------|---------------------|------|
| Módulo atual confundido com “avançada” / ICP | ALTO (produto/jurídico) | UI e políticas devem rotular **SIMPLES** |
| OTP exibido no painel se Resend falhar | MÉDIO | Contorno operacional; documentar limitação |
| Rate limit só em memória | MÉDIO | Bypass parcialmente possível em scale-out |
| Uso amplo de service role | MÉDIO/ALTO | Depende de checks de autorização nas rotas |
| Selo visual ≠ integridade criptográfica avançada | INFORMATIVO | Já declarado Lei 14.063; não ICP |
| Hash no servidor (bom) | — | Confirmar persistência e comparação na validação |
| Compatibilidade documentos antigos | ALTO se migrar errado | Nunca recategorizar como ADVANCED |
| Rotas Documenso / providers inativos | BAIXO | Isolar; não remover sem análise |
| Ausência de manifesto/certificado/cadeia append-only | ESPERADO | Escopo do módulo avançado |

---

## 13. Dúvidas técnicas encontradas

1. Nome canônico na migração futura: `SIMPLE` vs `LEGACY_SIMPLE` para evidências pré-campo `signature_level`?  
2. A página `/validar` deve bifurcar UI simples/avançada no mesmo path ou sub-rotas? (prompt indica `/verificar/{codigo}` — hoje é `/validar/{codigo}`; **não alterar rota pública sem autorização**.)  
3. Identidade VERIFIED: processo manual admin vs auto-validação CPF — política a fechar na Fase de identidade.  
4. MFA avançada: OTP e-mail já existe no simples; avançada exige reauth + MFA/passkey **adicional ou reforçado** — especificar diferença sem duplicar UX confusa.  
5. Lote avançado: reutilizar `gd_signature_batches` ou nova entidade `signature_batches` do modelo mestre?

---

## 14. Plano de auditoria (Fase 1)

1. Percorrer fluxo único documento linha a linha (`iniciar` → `confirmar` → storage → evidencia → validar).  
2. Percorrer fluxo lote.  
3. Inventariar colunas reais vs checklist Documento / Signatário / Operação do prompt.  
4. Classificar cada item: EXISTENTE E SEGURO / INCOMPLETO / INSEGURO / NÃO EXISTENTE / LEGADO.  
5. Classificar cada arquivo: PRESERVAR / CORRIGIR / ISOLAR NO SIMPLE / REUTILIZAR NO CORE / etc.  
6. Matriz de ameaças do §6.5 do prompt mestre.  
7. Gerar `docs/assinaturas/01-AUDITORIA-ASSINATURA-SIMPLES.md`.  
8. Só então Etapa 3: correções críticas **mínimas** no simples (sem herdar complexidade avançada).

---

## 15. O que esta fase **não** faz

- Implementação de Assinatura Avançada  
- SaaS / cobrança / white-label / API comercial  
- ICP-Brasil / GOV.BR obrigatório / biometria / certificado digital  
- Alteração de middleware, auth ou layout institucional  
- Renomear o motor atual como “avançado”

---

## 16. Próximo entregável

```text
docs/assinaturas/01-AUDITORIA-ASSINATURA-SIMPLES.md
```

Seguido de (ordem do prompt mestre): fluxo/docs do simples → estabilização → arquitetura compartilhada → módulo avançado → … → relatório final.
