# Fluxo do parceiro externo — Editais ate prestacao

## Modelo

- Venda por **login + modulos** no **processo** (pasta).
- **Ponto de partida:** Admin → **Editais** (cadastrar instrumento no processo).
- **Ponto final:** Transparencia → **Prestacao de contas** (publicacao humana).
- Site institucional IPECC (hero, LGPD, CMS) permanece com o **mestre**.

## Ciclo operacional

1. Mestre cria o processo e libera acesso (editais, propostas, transparencia).
2. Parceiro entra e cadastra o edital (cotacao previa, chamamento, etc.) ja com `processo_id`.
3. Abre **Governanca** do edital: fases, docs, propostas vinculadas.
4. Publico envia em `/propostas`; parceiro analisa em **Propostas**.
5. Aprovacao gera rascunho de convenio (ponte).
6. Avanco de fases / docs espelham na Transparencia.
7. Fase prestacao / convenio publicado → rascunhos de prestacao.
8. Parceiro revisa e **publica** em Convenios / Prestacao.

## SQL obrigatorio

`docs/sql/transparencia-modulo-ciclo-fase-1.sql`

## Ver tambem

- `docs/ADMIN-SITE-VS-PROCESSO.md`
- `docs/CICLO-TRANSPARENCIA-MODULO.md`
- `docs/GUIA-OPERACIONAL-GOVERNANCA-EDITAIS.md`
