# Roadmap enterprise local/staging

## Concluido neste ciclo

- Dependencias instalaveis e lockfile criado para validacao reprodutivel.
- Next atualizado dentro da linha 14 para reduzir vulnerabilidades sem salto breaking.
- Firebase atualizado dentro da linha 10 para reduzir vulnerabilidades sem salto breaking.
- Scripts locais adicionados para typecheck, validacao enterprise e smoke estatico.
- Pagina admin de documentos de editais corrigida para remover export default duplicado.
- Artefatos locais ignorados em `.gitignore`.
- Responsividade mobile reforcada em grids publicos, formulario de propostas, contato, login e tabela admin de documentos.
- Smoke crawler HTTP alinhado as rotas reais e a URLs HTML com `&amp;`.

## Proximos batches seguros

1. Rodar `npm run validar:enterprise` apos cada mudanca estrutural e corrigir falhas locais.
2. Melhorar estados vazios e feedback de salvamento em telas admin.
3. Consolidar scripts documentais quando os fluxos de anexos forem identificados no codigo.
4. Criar smoke HTTP local com servidor Next para paginas publicas e admin sem acessar producao.
5. Planejar upgrade breaking para Next 16/Firebase 12 como decisao separada, com matriz de compatibilidade.

## Bloqueios atuais

- Remover todas as vulnerabilidades restantes requer upgrade breaking de Next/Firebase.
- Acoes de producao, deploy e push permanecem fora do escopo automatico.

