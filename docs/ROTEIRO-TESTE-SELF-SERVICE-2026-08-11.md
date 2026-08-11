# Roteiro de teste manual — fluxo self-service completo

Este roteiro cobre o fluxo novo (cadastro → criar organização → convidar membro →
assinar plano) que não pôde ser validado neste ambiente porque o sandbox bloqueia
acesso de rede ao domínio de produção e ao Supabase a partir do navegador local.
Rode isto no navegador normal, direto em `https://www.ipecc.org.br` (ou no preview
da Vercel do branch/PR), e me diga o que falhar — eu corrijo em seguida.

Pré-requisito para o passo 6 em diante: `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`
configurados no Vercel (conta aberta no CNPJ da empresa comercial, não no do
IPECC). Sem isso, o botão de assinar deve responder com erro
`billing_not_configured` (comportamento esperado, não é bug).

## 1. Descoberta do plano (público, sem login)
- [ ] Abrir `/planos`. Os 4 cartões (Gratuito, Starter, Profissional, Enterprise) aparecem com preço e lista de recursos.
- [ ] O link "Planos" aparece no menu principal do site público.
- [ ] Clicar em "Começar grátis" / "Assinar Starter" / "Assinar Profissional" leva a `/cadastro`.
- [ ] Clicar em "Falar com a equipe" (Enterprise) abre o cliente de e-mail para `contato@ipecc.org.br`.

## 2. Cadastro
- [ ] Em `/cadastro`, preencher e-mail + senha e enviar.
- [ ] Caso o Supabase exija confirmação por e-mail: a tela deve mostrar a mensagem de "verifique seu e-mail", sem quebrar.
- [ ] Confirmar o e-mail (clicar no link recebido) e depois logar em `/login`.
- [ ] Login bem-sucedido de um usuário sem papel de staff deve redirecionar para `/conta` (não para `/admin`, e não bloquear o acesso).

## 3. Criação da organização
- [ ] Em `/conta`, sem organização ainda, deve aparecer o formulário "Bem-vindo(a)! Crie a sua [organização]".
- [ ] Criar uma organização com um nome qualquer. Deve redirecionar para o painel normal (cards de Plano / Equipe / Portal público).
- [ ] Testar criar uma organização com nome que gera slug repetido (ex.: duas orgs chamadas "Teste") — o sistema deve gerar um slug alternativo automaticamente (`teste-2`) em vez de falhar.
- [ ] O card "Portal público" deve apontar para `/org/<slug>` e o link deve abrir a página pública da organização.

## 4. Convite de membro
- [ ] Em `/conta/membros`, enviar um convite para um segundo e-mail de teste.
- [ ] A mensagem de retorno deve indicar se o convite foi enviado por e-mail (SMTP Zoho configurado em `email_config`) ou mostrar o link direto (se não estiver).
- [ ] Abrir o link do convite (`/convite/<token>`) em uma aba anônima (sem sessão) — deve mostrar os dados do convite via a função `validar_convite_token`, sem expor outros convites.
- [ ] Aceitar o convite com uma segunda conta — o novo usuário deve aparecer na lista de "Membros ativos" da organização original, não criar uma organização nova.
- [ ] Cancelar um convite pendente e confirmar que ele some da lista e que o link antigo deixa de funcionar.

## 5. Faturamento — visualização
- [ ] Em `/conta/faturamento`, o plano atual (`gratuito` após a criação) deve aparecer corretamente.
- [ ] Botões de upgrade (Starter/Profissional) devem estar visíveis para quem está no plano gratuito.
- [ ] Sem CNPJ/CPF cadastrado, deve aparecer o formulário pedindo o documento antes de mostrar os planos pra assinar.

## 6. Faturamento — checkout (depende da chave Asaas no Vercel)
- [ ] Preencher e salvar o CNPJ/CPF da organização.
- [ ] Clicar em "Assinar Starter" deve redirecionar para uma fatura real hospedada pelo Asaas (não erro 503 `billing_not_configured`, não erro 422 `cnpj_cpf_obrigatorio`).
- [ ] Completar um pagamento de teste (ambiente sandbox do Asaas, se `ASAAS_ENV=sandbox`) e voltar manualmente pra `/conta/faturamento`.
- [ ] Após o webhook `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` processar, o plano da organização em `/conta/faturamento` deve atualizar para "Starter" (pode levar alguns segundos — a página precisa ser recarregada, não há redirecionamento automático de volta como no Stripe).
- [ ] Clicar em "Ver última fatura" deve abrir a página hospedada pelo Asaas com o status do pagamento.
- [ ] Clicar em "Cancelar assinatura" deve cancelar no Asaas e voltar o plano da organização para "gratuito".
- [ ] Clicar em "Assinar" duas vezes seguidas sem pagar não deve criar duas assinaturas duplicadas no painel do Asaas — a segunda tentativa deve reaproveitar a mesma fatura pendente.

## 7. Autorização (checagem negativa, importante)
- [ ] Logado como membro comum (não-owner) de uma organização, tentar acessar `/api/admin/convites` com `DELETE` de um convite de **outra** organização — deve retornar erro de autorização, não sucesso.
- [ ] Deslogado (sem sessão), tentar acessar diretamente qualquer rota `/api/admin/*` (ex. `/api/admin/relatorios`, `/api/admin/lgpd/responder`) — todas devem retornar 401/403, nenhuma deve responder com dados.

## O que reportar
Para cada item que falhar, me diga: a URL exata, o que era esperado, o que aconteceu
(mensagem de erro / comportamento visual), e se possível um print. Eu corrijo e subo
a correção no mesmo branch.
