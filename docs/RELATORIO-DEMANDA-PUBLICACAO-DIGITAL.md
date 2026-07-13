# Relatório de demanda — Publicação Digital IPECC (worker vs admin)

**Data:** 2026-07-13  
**Projeto:** site IPECC (Next.js App Router + Supabase + Vercel)  
**Módulo:** Admin Digital (`/admin/digital`) + worker `services/digital-publisher`  
**Objetivo deste documento:** permitir que **outro agente** proponha alternativa melhor, sem repetir caminhos já rejeitados.

---

## 1. Demanda do usuário (o que ele quer de verdade)

| Critério | Expectativa |
|----------|-------------|
| Onde opera | **Só no admin** (web): aprovar → publicar |
| Fricção | **Não** quer rodar script / `.cmd` / PowerShell **a cada publicação** |
| Custo | **Resiste a VPS pago** (“isso é pago”) |
| Experiência | Ideal: clicar no admin e o post sair na rede (Instagram/Facebook) |

Em uma frase: **publicar pelas redes a partir do admin, sem operação manual de worker e sem mensalidade de servidor.**

---

## 2. Escopo de produto já travado (não confundir)

O módulo **não** é um agente autônomo de conteúdo.

Fluxo oficial:

`ADMIN cria/revisa → APROVA → (opcional) AGENDA → WORKER publica → ADMIN monitora`

- Admin: editorial (criar, revisar, aprovar, agendar, enfileirar)
- Worker: execução técnica (Playwright / browser com sessão)
- **Não** enviar senha Meta para o IPECC; sessão fica em perfil de browser

Docs existentes:

- `docs/DIGITAL-PUBLISHER-VPS.md`
- `docs/DIGITAL-PUBLISHER-PC.md`
- `services/digital-publisher/README.md`

---

## 3. Arquitetura atual (fato técnico)

```
[Admin na Vercel] --enfileira--> [Supabase: digital_posts / targets / logs]
                                         ^
                                         | claim + publish
                                         |
                              [Worker Playwright]  ← precisa de processo Node + browser
                              (PC ou VPS; NUNCA a Vercel)
```

### O que a Vercel faz hoje

- UI admin Digital
- APIs que **só enfileiram** (`/api/admin/digital/posts/publish-now`)
- Comentário explícito na API: *não executa Playwright nesta requisição*
- Caminho legado Graph API: `/api/admin/digital/publish` + `lib/digital/instagramPublish.ts`  
  (exige `META_GRAPH_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ACCOUNT_ID` na Vercel)

### O que o worker faz

- Poll da fila no Supabase
- Publicação via Playwright (estratégia browser / cookies)
- **Conectar (browser):** abre Chrome no PC; Meta bloqueia facilmente Chromium/headless/login em servidor
- Health: `http://127.0.0.1:8791/`
- Empacotamento Docker/Compose já existe para VPS 24h

### Por que “botão no admin liga o worker” não resolve

1. Navegador **não pode** iniciar processo Node/Chrome no PC do usuário  
2. Admin em **HTTPS (Vercel)** não substitui um runtime Playwright  
3. Painel “Verificar worker / Copiar comando” foi feito — usuário disse que **não resolve**, porque ainda exige script

---

## 4. Alternativas já avaliadas / estado

| # | Alternativa | Custo | Fricção do usuário | Status | Reação do usuário |
|---|-------------|-------|--------------------|--------|-------------------|
| A | **VPS 24h + Docker** | Pago (~R$20–40/mês) ou Free Tier difícil | Baixa no dia a dia (só admin) | Pack pronto no repo; VPS **não provisionado** | Quer o fluxo, **rejeita o custo** |
| B | **PC sob demanda** (script a cada publish) | Grátis | Alta | Implementado (cmd + painel admin) | **Rejeitado** (“não quero sempre rodar script”) |
| C | **PC sempre ligado** (auto-start Windows / serviço) | Grátis | Baixa se PC ligado 24h | **Não implementado** | Ainda não escolhido |
| D | **API oficial Meta (Graph)** no admin | Grátis de infra; custo de setup Meta | Baixa no dia a dia | Código legado existe; tokens **não** confirmados | Mencionado; não configurado |
| E | “Botão mágico no admin” que abre Chrome/worker sozinho | — | Ideal | **Inviável** na web pura | Desejado, mas tecnicamente bloqueado |

---

## 5. Restrições duras (não ignorar na nova proposta)

1. **Vercel Serverless** não é ambiente adequado para Playwright + sessão browser persistente.  
2. **Login Meta** em datacenter/headless costuma falhar (detecção de bot); login no Chrome do PC é o caminho que o projeto adotou.  
3. Sessões ficam em `.browser-profiles` / volume Docker — copiar PC→VPS se usar servidor.  
4. Regras do projeto: mudanças mínimas; **não** alterar layout/auth/middleware/rotas públicas sem autorização; textos admin em **PT-BR**.  
5. Deploy Vercel vem do remote **`site-ipecc`** (push dual: `origin` + `site-ipecc`).  
6. Worker **fora** da Vercel é decisão de arquitetura já documentada, não acidente.

---

## 6. O que já está no código (para não reinventar)

### Admin

- `/admin/digital` — perfis, fila, Conectar, Verificar sessão, Publicar agora (fila), Instagram legado  
- Card recente: **“Publicação neste PC”** (status localhost + copiar comando) — usuário não considera solução  
- `publish-now` enfileira com `dry_run: false` (publicação real na fila)

### Worker

- `services/digital-publisher/` (TypeScript, poll, Instagram browser publisher)  
- `scripts/run-digital-publisher.cjs` (`--publish` = real)  
- `scripts/iniciar-publicacao-digital.cmd`  
- `Dockerfile` + `docker-compose.yml` (volume `./data/browser-profiles`)  
- `scripts/gerar-env-digital-publisher-vps.cjs`

### Dados

- Tabelas/automação Digital no Supabase (fila, `automation_status`, logs)  
- Bucket `digital-media`

---

## 7. Problema a resolver (formulacão para o próximo agente)

**Problema:** O usuário quer publicação social a partir do admin com **fricção zero** e **custo zero de VPS**, mas o caminho atual (Playwright + sessão browser) **exige um processo sempre disponível** fora da Vercel.

**Pergunta aberta:** Existe alternativa **melhor** que:

- não cobre VPS mensal, **e**
- não obriga script manual a cada post, **e**
- funciona de forma confiável com Instagram/Facebook no contexto IPECC?

---

## 8. Direções sugeridas para o próximo agente (não implementadas)

Avaliar com trade-offs honestos:

1. **Priorizar Graph API / Meta Content Publishing**  
   - Publicação 100% no admin (Vercel)  
   - Exige app Meta, conta profissional, tokens, permissões, refresh de token  
   - Pode abandonar (ou reduzir) Playwright para o dia a dia  

2. **Worker no PC como serviço Windows (uma vez)**  
   - Task Scheduler / NSSM / pm2 no boot  
   - Grátis; depende do PC ligado e online  

3. **Free Tier / mini-VPS** (Oracle, etc.)  
   - Mesma arquitetura Docker; risco operacional e “grátis” frágil  

4. **Híbrido**  
   - Graph API para Instagram image posts  
   - Browser worker só para casos que a API não cobre  

5. **Ferramentas terceiras** (Buffer, Meta Business Suite agendado, n8n self-hosted no mesmo PC, etc.)  
   - Avaliar se encaixa no “só admin IPECC” ou se aceita outro painel  

**Não propor de novo sem inovação:** “abra o `.cmd` antes de publicar” — já rejeitado.

---

## 9. Critérios de sucesso (aceite do usuário)

Uma proposta é “melhor” se atender **nesta ordem**:

1. Usuário publica pelo admin **sem** abrir terminal/script naquele momento  
2. Preferência forte por **custo R$ 0/mês** de infra contínua  
3. Confiável o suficiente para Instagram (e Facebook se no escopo)  
4. Compatível com governança: admin aprova; nada de postar sozinho sem aprovação  
5. Mudanças mínimas no site; PT-BR no admin  

---

## 10. Decisão atual do usuário

- Quer o **efeito** do VPS 24h (só admin, zero script no dia a dia)  
- **Não** quer arcar com VPS pago (pelo menos neste momento)  
- Rejeitou PC sob demanda  
- Pediu este relatório para **outro agente** buscar alternativa melhor  

---

## 11. Prompt sugerido para colar no outro agente

```
Leia docs/RELATORIO-DEMANDA-PUBLICACAO-DIGITAL.md no repo IPECC.

Demanda: publicar Instagram/Facebook só pelo admin, sem script a cada post e sem VPS pago.

Arquitetura atual: Vercel enfileira; Playwright worker fora da Vercel; Conectar via Chrome/sessão.

Já rejeitado: rodar script/.cmd a cada publicação.
VPS 24h resolve UX mas o usuário não quer pagar.

Proponha a melhor alternativa viável (técnica + custo + fricção), com trade-offs, arquivos a tocar e plano mínimo.
Não proponha de novo “ligar o worker manualmente toda vez”.
```

---

## 12. Arquivos-chave (mapa rápido)

| Área | Caminho |
|------|---------|
| Admin UI | `app/admin/digital/page.tsx` |
| Enfileirar | `app/api/admin/digital/posts/publish-now/route.ts` |
| Fila | `lib/digital/publishQueue.ts` |
| Graph legado | `lib/digital/instagramPublish.ts`, `app/api/admin/digital/publish/route.ts` |
| Worker | `services/digital-publisher/src/` |
| VPS | `docs/DIGITAL-PUBLISHER-VPS.md`, `services/digital-publisher/docker-compose.yml` |
| PC | `docs/DIGITAL-PUBLISHER-PC.md`, `scripts/run-digital-publisher.cjs` |
