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
- Contratos locais de anexos documentais adicionados com `audit:anexos` e `verify:proposta-anexos`.
- Caminhos de PDFs de editais padronizados para novos uploads, preservando leitura de legado com prefixo `editais/`.
- Detalhe admin de propostas passou a expor proposta, estatuto social e cartao CNPJ.
- Navegacao admin mobile preservada com menu horizontal e estados de erro adicionados em propostas.
- Headers conservadores de seguranca configurados no Next.js (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) e `X-Powered-By` desabilitado.
- Endpoint local/staging `/api/health` e script `smoke:health` adicionados para observabilidade basica sem expor segredos.

## Proximos batches seguros

1. Rodar `npm run validar:enterprise` apos cada mudanca estrutural e corrigir falhas locais.
2. Melhorar feedback de salvamento em telas admin que ainda usam `alert`.
3. Expandir scripts documentais para validar fluxos de `docs`/transparencia quando houver contrato de dados definido.
4. Automatizar smoke HTTP local com lifecycle de servidor dedicado.
5. Planejar upgrade breaking para Next 16/Firebase 12 como decisao separada, com matriz de compatibilidade.

## Bloqueios atuais

- Remover todas as vulnerabilidades restantes requer upgrade breaking de Next/Firebase.
- Acoes de producao, deploy e push permanecem fora do escopo automatico.

