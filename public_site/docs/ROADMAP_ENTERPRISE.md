# Roadmap enterprise local/staging

## Prioridade alta

- [x] Restaurar instalacao reprodutivel com `package-lock.json`.
- [x] Corrigir erro TypeScript bloqueante no admin de documentos de editais.
- [x] Adicionar scripts locais para validacao enterprise minima.
- [x] Remover `node_modules` do versionamento e preservar lockfile.
- [x] Atualizar Next 14 e Firebase 10 para patches compativeis.

## Proximos batches seguros

- Melhorar responsividade do header/menu publico sem alterar conteudo.
- Consolidar smoke test local para rotas publicas principais.
- Revisar acessibilidade basica de navegacao e foco no site publico.
- Criar verificacoes dedicadas para anexos de propostas quando o contrato de storage estiver estabilizado.

## Bloqueios que exigem decisao externa

- Resolver vulnerabilidades restantes do `undici` exige avaliar upgrade major do Firebase.
- Qualquer mudanca de RLS, SQL destrutivo, producao ou deploy deve ser revisada fora do ciclo automatico.
