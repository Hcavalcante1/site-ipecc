# Checklist de Validacao por Batch

Use este checklist antes de commit em qualquer batch enterprise local/staging.

## Sempre

- [ ] `git status --short` executado antes de iniciar.
- [ ] Escopo pequeno ou medio, sem mudancas destrutivas.
- [ ] Conteudo institucional preservado.
- [ ] Fluxo publico e admin preservados.
- [ ] Compatibilidade legado/fallback hibrido preservada.
- [ ] `npx tsc --noEmit` executado.
- [ ] `npm run validar:enterprise` executado quando aplicavel.

## Se tocar documental, storage ou anexos

- [ ] `npm run audit:anexos` executado se o script existir.
- [ ] `npm run verify:proposta-anexos` executado se o script existir.
- [ ] Nenhum dado, bucket ou chave real alterado.
- [ ] Links e nomes de arquivos mantidos compativeis.

## Se tocar visual, publico ou admin

- [ ] `npm run build` executado quando a estrutura critica mudar.
- [ ] Browser smoke realizado nas rotas afetadas.
- [ ] Estados de loading, erro e vazio preservados ou melhorados.
- [ ] Responsividade basica verificada.

## Se tocar configuracao ou scripts

- [ ] Scripts novos sao locais/read-only por padrao.
- [ ] Nao dependem de segredos reais.
- [ ] Falhas retornam exit code diferente de zero.
- [ ] Mensagens de erro indicam o arquivo ou rota afetada.

## Registro final

- [ ] Resumo curto preparado.
- [ ] Arquivos alterados listados.
- [ ] Validacoes registradas.
- [ ] Proximo batch recomendado.
