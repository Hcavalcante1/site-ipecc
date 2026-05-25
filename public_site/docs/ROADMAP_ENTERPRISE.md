# Roadmap enterprise local/staging

## Prioridade alta

- [x] Restaurar instalacao reprodutivel com `package-lock.json`.
- [x] Corrigir erro TypeScript bloqueante no admin de documentos de editais.
- [x] Adicionar scripts locais para validacao enterprise minima.
- [x] Remover `node_modules` do versionamento e preservar lockfile.
- [x] Atualizar Next 14 e Firebase 10 para patches compativeis.
- [x] Melhorar responsividade e acessibilidade basica do header publico.
- [x] Adicionar script `start` para smoke local com `next start`.
- [x] Consolidar smoke test local para rotas publicas principais.
- [x] Adicionar headers HTTP conservadores de seguranca no Next.
- [x] Fortalecer validacao local de anexos PDF no envio de propostas.
- [x] Criar verificacao local dedicada para contrato de anexos de propostas.
- [x] Tornar campos do formulario de propostas responsivos em mobile.
- [x] Compartilhar validacao PDF entre propostas e uploads de editais no admin.
- [x] Criar preflight local de release sem publicacao.

## Proximos batches seguros

- Revisar acessibilidade basica de navegacao e foco no site publico.
- Expandir validacoes de upload para demais areas documentais sem alterar RLS ou schema.

## Bloqueios que exigem decisao externa

- Resolver vulnerabilidades restantes do `undici` exige avaliar upgrade major do Firebase.
- Qualquer mudanca de RLS, SQL destrutivo, producao ou deploy deve ser revisada fora do ciclo automatico.
