# Fase 1 — Auditoria da Assinatura Eletrônica Simples (motor IPECC)

**Data:** 2026-07-14  
**Premissa:** o motor em `lib/documentos/signing/` + provider `ipecc` é **Assinatura Simples** e deve ser preservado.  
**Método:** confirmação no código, SQL e rotas (não apenas nas telas).  
**Documento anterior:** `docs/assinaturas/00-INSPECAO-INICIAL.md`

---

## 1. Resumo executivo

O módulo atual é uma **assinatura eletrônica simples** com:

- sessão admin + módulo Documentos;
- consentimento explícito;
- reautenticação por senha;
- OTP por e-mail (hash + TTL + tentativas);
- carimbo visual no PDF (Lei 14.063/2020, não ICP-Brasil);
- SHA-256 calculado no **servidor**;
- evidência persistida;
- verificação pública por código com **re-hash** do arquivo.

Não é assinatura avançada, qualificada nem ICP-Brasil. Falta rótulo formal `SIMPLE` / `signature_level` e há lacunas de segurança a tratar na estabilização (Etapa 3), sem transformar o fluxo em avançado.

---

## 2. Fluxo completo — documento único

| Etapa | Arquivo / função | Rota | Tabela / bucket | Dados | Validação | Risco |
|-------|------------------|------|-----------------|-------|-----------|-------|
| Documento criado / arquivo preparado | Upload admin; hash servidor | `POST .../documentos/[id]/upload` | `gd_documents`, `gd_document_versions`; bucket `gestao-documental`; path `{processo\|geral}/{docId}/vN-...`; `upsert: false` | MIME, tamanho, `file_hash` | Escopo + auth admin | BAIXO se escopo ok |
| Pedido de assinatura | `criarAssinaturaDocumento` (`signatureService`) | `POST /api/admin/documentos/assinaturas` | `gd_signature_documents`, `gd_signature_signers` | `provider_code=ipecc`, signatário, modo | Escopo documento | MÉDIO se signers vazios depois |
| Visualização (prévia) | `AssinarNoAdminModal` + pdf.js | `GET .../documentos/{id}/arquivo` | leitura storage | PDF binário | Auth + escopo | BAIXO |
| Consentimento + iniciar | `iniciarAssinaturaIpecc` | `POST .../assinaturas/[id]/ipecc/iniciar` | status `ready`; `gd_signature_events` (`consent_accepted`); OTP challenge | `consentAccepted`, IP/UA | Checkbox obrigatório; **não** pré-marcado | Ver matriz: escopo ausente |
| OTP | `criarEEnviarOtp` / `consumirOtp` | iniciar + `POST .../ipecc/otp` | `gd_signature_otp_challenges` (`code_hash` only) | e-mail, TTL 10 min, max 5, cooldown 60s | Hash + pepper | ALTO se `devCode` em prod |
| Confirmação | `confirmarAssinaturaIpecc` + `confirmarSenhaUsuario` | `POST .../ipecc/confirmar` | — | senha, OTP, nome, CPF, cargo, placement | Senha Supabase + OTP | Race / escopo |
| PDF gerado | `carimbarPdfAssinatura` | (server) | — | selo + QR `/validar/{codigo}` | CPF básico (11 dígitos) | Selo ≠ ICP |
| PDF salvo | upload stamped | (server) | path `{docId}/signed/{sigId}-{serial}.pdf` (`upsert: true`); nova `gd_document_versions`; **atualiza** `gd_documents.storage_path`/`file_hash` | `signed_hash` | — | MÉDIO sobrescrita ponteiro |
| Registro | `registrarEvidencia` | (server) | `gd_signature_evidences`; eventos; logs | hashes, IP, UA, consent, serial, validation_code | Unique validation_code | RLS bypass via service role |
| QR | `gerarCodigoValidacao` (`randomBytes(6)` → 12 hex) | embutido no PDF | — | URL validação | Entropia ~48 bits | MÉDIO enumeração parcial + rate limit frágil |
| Verificação pública | `obterValidacaoPublica` | `/validar/[codigo]`, `GET /api/public/validar/[codigo]` | lookup evidência; re-hash storage; `gd_validation_lookups` | status integridade; **sem CPF** no JSON; **com e-mail** | Compara `signed_hash_sha256` | PII e-mail; sem rótulo SIMPLES |
| Download | — | `GET /api/download/assinatura/[codigo]` | path **só** da evidência | PDF | — | BAIXO path traversal (mitigado) |

### Estados do envelope

`pending` → `ready` (iniciar) → `signing` (parcial multi-signer) → `signed` (todos `required` concluídos).

**Atenção:** se `signers.length === 0`, o fluxo pode concluir como assinado (`documentoConcluido = true`).

---

## 3. Fluxo lote — diferenças

| Aspecto | Único | Lote |
|---------|-------|------|
| Serviço | `ipeccSignService` | `batchSignService` |
| OTP | por `signature_document_id` | por `batch_id` |
| Auth | senha + OTP a cada confirmar | senha + OTP **uma vez**; itens com `skipAuth: true` |
| Escopo processo | **Ausente** nas rotas `.../assinaturas/[id]/ipecc/*` | **Presente** em `.../lotes/[id]/ipecc/*` via `registroNoEscopoProcesso` |
| Reenvio OTP | rota `.../otp` | modal rechama `iniciar` do lote |
| Resultado | evidenceId, validationCode | progresso + falhas parciais |

Arquivos: `batchSignService.ts`, `app/api/admin/documentos/lotes/[id]/ipecc/{iniciar,confirmar}/route.ts`.

---

## 4. Inventário de dados — classificação

Legenda: **EXISTENTE E SEGURO** | **EXISTENTE MAS INCOMPLETO** | **EXISTENTE E INSEGURO** | **NÃO EXISTENTE** | **LEGADO** | **NÃO UTILIZADO**

### 4.1 Documento

| Item | Classificação | Evidência |
|------|---------------|-----------|
| ID, nome/título, MIME, tamanho, status, proprietário/processo | EXISTENTE E SEGURO (relativo ao módulo docs) | `gd_documents` |
| Versão + path histórico | EXISTENTE MAS INCOMPLETO | `gd_document_versions`; ponteiro atual vira o stamped |
| Hash original / atual | EXISTENTE MAS INCOMPLETO | `file_hash`; na evidência, `document_hash_sha256` = PDF no momento do carimbo (pode já estar carimbado em multi-signer) |
| Hash assinado | EXISTENTE E SEGURO | `signed_hash` / `signed_hash_sha256` |
| `validation_code`, `stamped_version_id`, `signing_mode` | EXISTENTE E SEGURO | SQL IPECC |
| `signature_level` = SIMPLE | NÃO EXISTENTE | — |
| Campos dedicados original vs final imutáveis | NÃO EXISTENTE / PARCIAL via versões | — |

### 4.2 Signatário

| Item | Classificação | Evidência |
|------|---------------|-----------|
| id, nome, e-mail, CPF, user_id, cargo, status, signed_at | EXISTENTE MAS INCOMPLETO | `gd_signature_signers` |
| Modo sequential/parallel, required | EXISTENTE MAS INCOMPLETO | parallel com fallback frágil |
| Assinatura visual (imagem livre do cliente) | NÃO UTILIZADO no motor atual | selo gerado no servidor |
| Identidade VERIFIED / habilitação avançada | NÃO EXISTENTE | escopo do módulo avançado |
| Binding forte user ↔ signatário no confirmar | EXISTENTE E INSEGURO (parallel) | fallback `pendingSigners[0]` |

### 4.3 Operação / evidência

| Item | Classificação | Evidência |
|------|---------------|-----------|
| id, data/hora, IP, UA, OS, browser, tela, timezone | EXISTENTE E SEGURO | `gd_signature_evidences` + meta cliente |
| Consentimento texto + timestamp | EXISTENTE E SEGURO | |
| auth_methods password + email_otp | EXISTENTE MAS INCOMPLETO | hardcoded; sem session_id |
| otp_challenge_id, validation_code, serial | EXISTENTE E SEGURO | |
| session_id / request_id de assinatura | NÃO EXISTENTE (IPECC) | `external_session_id` no envelope é LEGADO/provider externo |
| Eventos `gd_signature_events` | EXISTENTE MAS INCOMPLETO | tem `updated_at`/`deleted_at` — não append-only rígido |
| Lookups `gd_validation_lookups` | EXISTENTE E SEGURO | |
| Código OTP em claro no DB | NÃO EXISTENTE (bom) | só `code_hash` |
| OTP em claro no painel (`devCode`) | EXISTENTE E INSEGURO | quando Resend falha |

---

## 5. Classificação de arquivos

| Arquivo | Destino |
|---------|---------|
| `signing/ipeccSignService.ts` | PRESERVAR + CORRIGIR (escopo, race, parallel, upsert) |
| `signing/batchSignService.ts` | PRESERVAR + CORRIGIR |
| `signing/otpService.ts` | PRESERVAR + CORRIGIR (`devCode`, pepper) |
| `signing/passwordConfirm.ts` | PRESERVAR |
| `signing/evidenceService.ts` | REUTILIZAR NO CORE |
| `signing/validationService.ts` | REUTILIZAR NO CORE + CORRIGIR (PII/rótulo) |
| `signing/pdfStampService.ts` | ISOLAR NO SIMPLE |
| `signing/rateLimit.ts` | PRESERVAR agora; CORRIGIR médio prazo (distribuído) |
| `signing/laudoService.ts` | PRESERVAR / REUTILIZAR NO CORE |
| `signing/constants.ts` | PRESERVAR (+ evoluir campos level depois) |
| `signature/IpeccProvider.ts` | ISOLAR NO SIMPLE |
| `signature/SignatureProvider.ts`, `index.ts` | REUTILIZAR NO CORE |
| `signature/DocumentoProvider.ts`, `DocumensoProvider.ts` | DEPRECAR FUTURAMENTE / NÃO ALTERAR agora |
| `signature/GovBrProvider.ts` | NÃO ALTERAR (stub; não é avançada desta fase) |
| `AssinarNoAdminModal.tsx` | PRESERVAR + CORRIGIR (rótulo SIMPLES, OTP painel) |
| `AssinaturasClient.tsx` | PRESERVAR |
| Rotas `.../assinaturas/[id]/ipecc/*` | PRESERVAR + CORRIGIR (escopo processo) |
| Rotas lote `.../lotes/[id]/ipecc/*` | PRESERVAR |
| `app/validar/[codigo]/*`, API pública | NÃO ALTERAR path sem autorização; CORRIGIR conteúdo (rótulo, PII) |
| `api/download/assinatura/[codigo]` | PRESERVAR |
| `docs/sql/gestao-documental-assinatura-ipecc.sql` | PRESERVAR |
| `docs/sql/gestao-documental-fase-1.sql` | NÃO ALTERAR sem migração cuidadosa |
| `signatureService.ts` | REFATORAR COM CUIDADO |
| `adminGate.ts` | NÃO ALTERAR (auth) |

---

## 6. Matriz de riscos (§6.5 do prompt mestre)

| Risco | Severidade | Status | Evidência |
|-------|------------|--------|-----------|
| Assinatura sem autenticação de sessão | BAIXO | Mitigado | `denyIfSemModuloDocumentos` / sessão admin |
| Assinatura por usuário sem módulo | BAIXO | Mitigado | gate Documentos |
| Admin assina pedido **fora do escopo** de processo | ALTO | Aberto | Rotas `assinaturas/[id]/ipecc/*` sem `registroNoEscopoProcesso` (lotes têm) |
| Administrador assina **em nome de terceiro** (identity) | MÉDIO | Parcial | Flow “eu assino” / e-mail; parallel frágil |
| Assinatura visual enviada/manipulada pelo cliente | INFORMATIVO | N/A | Selo gerado no servidor |
| Hash calculado no navegador / confiado | INFORMATIVO | Não ocorre | `sha256Bytes` servidor |
| Hash não persistido | BAIXO | Mitigado | evidência + documento |
| PDF sobrescrito / ponteiro atual = stamped | MÉDIO | Aberto | `upsert: true`; update `gd_documents.storage_path` |
| PDF alterado após assinatura | MÉDIO | Detectável na validação pública (re-hash) | `validationService` |
| Arquivo público sem controle | MÉDIO | Parcial | Quem tem o código valida/baixa |
| Código de verificação previsível | MÉDIO | Parcial | 48 bits + rate limit in-memory |
| QR apontando rota insegura | BAIXO | Rota pública intencional | `/validar/{codigo}` |
| Logs/eventos editáveis/deletáveis | MÉDIO | Aberto | soft-delete em events/logs; sem trigger anti-tamper em evidências no SQL lido |
| Falta de RLS efetiva (só ENABLE + service role) | ALTO | Aberto | padrão APIs admin; políticas CREATE POLICY IPECC incompletas/ausentes no SQL inspecionado |
| Uso excessivo service role | ALTO | Aceito com risco | `getSupabaseAdmin()` |
| Assinatura duplicada / clique duplo / race | ALTO | Aberto | check status sem update atômico; serial = count+1 |
| Replay OTP | BAIXO | Mitigado | `consumed_at` |
| Versão errada assinada | MÉDIO | Parcial | baixa `storage_path` atual no confirmar |
| Upload malicioso / MIME falso / path traversal | BAIXO–MÉDIO | Upload docs separado; download path do DB | download OK |
| Acesso entre organizações/processos | ALTO | Aberto nas rotas por ID de assinatura | ver escopo |
| Vazamento CPF | MÉDIO | PDF + admin; omitido no JSON público | página `/validar` ainda expõe e-mail |
| Validação apenas visual | MÉDIO (produto) | Código re-hash existe; UI fraca em limitações | |
| Sucesso antes da persistência | NÃO CONFIRMADO como bug | Revisar ordem insert evidência vs response na Etapa 3 | |
| OTP no modal (`devCode`) | ALTO (prod sem Resend) | Aberto | `otpService` + modal |
| Pepper OTP fallback hardcoded | ALTO (config) | Aberto | `constants.ts` `otpPepper()` |
| CPF sem dígitos verificadores | MÉDIO | Aberto | `validarCpfBasico` |
| Parallel atribui signatário errado | ALTO | Aberto | `pendingSigners[0]` |
| Zero signers conclui signed | MÉDIO | Aberto | `ipeccSignService` |
| Rate limit só memória | MÉDIO | Aberto | `rateLimit.ts` |

---

## 7. Controles do “simples mínimo” — gap analysis

### Presentes

- Usuário autenticado (admin) + módulo.
- Vínculo pedido ↔ documento ↔ versão/path.
- Data/hora + metadados de contexto.
- Versões documentais (histórico de arquivos).
- Status no envelope/signers/documento.
- Código de verificação + QR.
- Consentimento explícito.
- Senha + OTP.
- Hash servidor + checagem na validação pública.
- Lote com auth única e falha parcial.

### Ausentes ou incompletos (Etapa 3 — estabilização)

1. Rótulo explícito **Assinatura eletrônica simples** (admin + `/validar`) + aviso de não-ICP.  
2. Escopo de processo nas rotas `.../assinaturas/[id]/ipecc/*` (paridade com lotes).  
3. Anti-duplicidade atômica no confirmar.  
4. Política de `devCode` / pepper obrigatório em produção.  
5. Correção do fallback parallel / zero signers.  
6. Campo ou metadata `signature_level=SIMPLE` (migração não destrutiva; legado = SIMPLE).  
7. Rate limit distribuído (médio prazo).  
8. Endurecer imutabilidade de evidências no SQL (médio prazo; alinhar com avançada).  
9. Reduzir PII na página pública (e-mail) conforme política LGPD.

**Não** herdar nesta estabilização: manifesto Ed25519, MFA passkey obrigatório, certificado de evidências avançado, identidade HIGH, etc.

---

## 8. Compatibilidade retroativa

| Regra | Ação |
|-------|------|
| Documentos já assinados | NÃO alterar arquivos; NÃO reprocessar |
| Validação `/validar/{codigo}` | Manter path e códigos existentes |
| Classificação level | Futuro: default `SIMPLE` / `LEGACY_SIMPLE` para linhas sem campo |
| Providers inativos (documenso, etc.) | Não apagar; não confundir com avançada |

---

## 9. Decisões para a Etapa 3 (próxima)

Prioridade sugerida (mínima e reversível):

1. **CORRIGIR** escopo nas rotas IPECC por assinatura.  
2. **CORRIGIR** race/duplicidade no confirmar.  
3. **CORRIGIR** parallel / zero signers.  
4. **CORRIGIR** pepper obrigatório + restringir `devCode` fora de desenvolvimento.  
5. **UX/copy** rótulo SIMPLES + disclaimer (sem redesign de layout).  
6. Documentar limitações em `08-POLITICA-ASSINATURA-SIMPLES.md` (fase de políticas).

Em paralelo documental: `02-FLUXO-ASSINATURA-SIMPLES.md` após estabilização crítica ou junto com as correções.

---

## 10. Itens NÃO CONFIRMADOS

- Lista completa de `CREATE POLICY` RLS para todas as tabelas `gd_signature_*` em todos os SQL do repo (há ENABLE RLS; policies podem estar noutros ficheiros — inventário SQL restante na Etapa 3).  
- Triggers anti-UPDATE/DELETE em `gd_signature_evidences`: **não encontrados** no SQL IPECC.  
- Comportamento exacto multi-região Vercel para rate limit (inferido: Map por processo).

---

## 11. Conclusão da Fase 1

A auditoria confirma um motor **funcional e adequável como Assinatura Simples**, com base de evidências e verificação pública reutilizáveis no core. Os riscos **ALTO** abertos (escopo nas rotas por ID, race, OTP/`devCode`/pepper, parallel) devem ser tratados **antes** de construir o módulo avançado, em mudanças mínimas, sem alterar middleware/auth global nem layout institucional.

**Próximo passo obrigatório (prompt mestre Etapa 3):** estabilização do módulo simples com as correções críticas listadas na §9.
