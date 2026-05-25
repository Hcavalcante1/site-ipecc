# Runbook enterprise local/staging

## Ciclo padrao

1. Verificar estado: `git status --short`
2. TypeScript: `npx tsc --noEmit`
3. Validacao enterprise: `npm run validar:enterprise`
4. Anexos/documental quando aplicavel:
   - `npm run audit:anexos`
   - `npm run verify:proposta-anexos`
5. Build critico: `npm run build`
6. Smoke estatico apos build: `npm run smoke:site`
7. Auditoria de dependencias: `npm audit --audit-level=moderate`

## Escopo validado neste batch

- Scripts locais enterprise adicionados ao `package.json`.
- Dependencias atualizadas para linha atual de Next, React, Firebase, Supabase e TypeScript.
- `npm audit --audit-level=moderate` sem vulnerabilidades conhecidas.
- Smoke estatico valida rotas e assets locais em `.next/server/app`.
- Links documentais `/docs/*.pdf` sao reportados como aviso no smoke estatico; a validacao do conteudo real deve acontecer contra storage/staging ou pacote documental revisado.

## Pendencias seguras para proximos batches

- Revisar publicacao real dos documentos em `/docs` ou mover os links para storage/CMS com auditoria documental.
- Padronizar componentes visuais publicos e reduzir estilos inline em paginas/admin.
