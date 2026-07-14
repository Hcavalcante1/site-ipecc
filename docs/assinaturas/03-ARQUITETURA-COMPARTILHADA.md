# Fase 3 — Arquitetura compartilhada (Simples + Avançada)

**Data:** 2026-07-14  
**Princípio:** compartilhar contratos, documentos e verificação; **não** misturar políticas dos dois níveis.

## Mapa adaptado ao repositório atual

```text
lib/documentos/
├── signing/                    # = Assinatura SIMPLES (motor ipecc atual) — PRESERVAR
├── signature/                  # factory de providers legados
└── assinaturas/                # camada nova (core + advanced)
    ├── core/
    │   ├── types.ts
    │   ├── contracts.ts
    │   ├── errors.ts
    │   └── permissions.ts
    ├── shared/                 # (evolução futura: hash, storage paths)
    └── advanced/               # módulo avançado (fases seguintes)
```

Rotas públicas atuais (`/validar/{codigo}`) permanecem; avançada reutilizará o mesmo path com bifurção por `signature_level` quando existir.

## Providers

- `SimpleSignatureProvider` → adapta `ipeccSignService` (nível SIMPLE)
- `AdvancedSignatureProvider` → implementação nas fases 6–13
- Sem provider ICP-Brasil nesta fase

## Tipos obrigatórios

Ver `lib/documentos/assinaturas/core/types.ts` e `contracts.ts`.
