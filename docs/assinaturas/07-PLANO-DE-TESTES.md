# 07 — Plano de testes

## Automatizado (script)
`npm run validar:assinaturas` — checks estruturais (arquivos, exports, rotas, SQL).

## Manuais obrigatórios

### Compatibilidade
- [ ] Assinatura simples continua
- [ ] `/validar/{codigo}` antigo abre
- [ ] Registro legado ≠ ADVANCED

### Autorização
- [ ] User sem escopo → 403
- [ ] Avançada: outro userId → 403
- [ ] Identidade NOT_VERIFIED → bloqueia avançada

### Auth
- [ ] Senha errada / OTP errado / OTP reutilizado / desafio expirado (5 min)

### Consentimento
- [ ] Checkbox desmarcado impede; texto versionado

### Integridade
- [ ] Alterar PDF assinado → FILE_TAMPERED / divergente
- [ ] Manifesto adulterado → EVIDENCE_TAMPERED

### Lote avançado
- [ ] Hash do lote diverge se item muda
- [ ] Sucesso parcial com falhas listadas
- [ ] Não adiciona docs após freeze

### Público
- [ ] VÁLIDO / NÃO ENCONTRADO / avançada vs simples rótulos
