# Roadmap enterprise local/staging

## Concluido neste ciclo

- Base operacional enterprise criada para validacoes locais.
- Scripts de typecheck, validacao enterprise, auditoria de anexos, verificacao de proposta/anexos e smoke adicionados.
- `.gitignore` endurecido para impedir versionamento de envs reais.
- Runbook local/staging criado.
- Cabecalho publico ganhou melhorias de acessibilidade, foco visivel e responsividade mobile.
- Admin mobile preserva navegacao em barra rolavel e login usa largura fluida.

## Proximos batches seguros

1. Corrigir erros de TypeScript revelados por `npm run typecheck`.
2. Eliminar dependencias client-side desnecessarias em layouts/admin quando causarem regressao de build.
3. Padronizar clientes Supabase para reduzir duplicacao e falhas por env ausente.
4. Expandir smoke local para rotas publicas e login/admin conforme a build estabilizar.

## Bloqueios de producao

- Deploy, push para producao, Supabase Dashboard, SQL destrutivo e RLS critica permanecem fora do escopo autonomo local.
