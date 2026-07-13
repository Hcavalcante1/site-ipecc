# Publicar pelo PC (legado — sob demanda)

> **Preferido:** agente residente no Windows (instalação única) —  
> [`DIGITAL-PUBLISHER-AGENTE-WINDOWS.md`](./DIGITAL-PUBLISHER-AGENTE-WINDOWS.md)

A Vercel **não** executa o Playwright. O admin só **enfileira**; o worker no PC **publica**.

## Fluxo (pelo admin)

1. Abra `/admin/digital` — card **Publicação neste PC**
2. Clique **Copiar comando para ligar**, cole no PowerShell na pasta do projeto e Enter  
   (atalho: `scripts/iniciar-publicacao-digital.cmd`)
3. No admin: **Verificar worker** → deve aparecer **ligado**
4. Aprove o post → **Publicar agora (fila)**
5. Quando terminar: Ctrl+C na janela do worker

Health local: [http://127.0.0.1:8791/](http://127.0.0.1:8791/)

## O que NÃO funciona

- Clicar em “Publicar agora” **sem** o worker ligado → o post fica na fila e não sai
- Esperar que a Vercel abra o Chrome → não abre

## Agendamento

Posts agendados para horário futuro só saem se o worker estiver **ligado naquele horário**.  
Sem VPS: publique na hora (“Publicar agora”) com o worker aberto, ou ligue o PC/worker no horário marcado.

## Dry-run (teste)

```bash
node scripts/run-digital-publisher.cjs
```

Simula sucesso sem postar na rede.

## VPS (opcional)

Se no futuro quiser fila 24h: `docs/DIGITAL-PUBLISHER-VPS.md`
