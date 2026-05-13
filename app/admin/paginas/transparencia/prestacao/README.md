# Módulo de Prestação de Contas

## Finalidade

Este módulo permite a administração das prestações de contas dos convênios no sistema de transparência. Os usuários administradores podem visualizar, adicionar, editar, salvar e excluir registros de prestação de contas, incluindo upload de documentos PDF relacionados.

## Estrutura dos Arquivos

- **`page.tsx`**: Página principal do módulo, responsável por renderizar a interface de administração, gerenciar o estado dos dados e coordenar as operações CRUD.
- **`components/PrestacaoCard.tsx`**: Componente que representa um cartão individual de prestação de contas, contendo os campos de formulário e controles de ação.
- **`types.ts`**: Arquivo contendo todas as definições de tipos TypeScript utilizadas no módulo, como `Convenio`, `PrestacaoConta` e `LoadingOperationType`.
- **`constants.ts`**: Arquivo com constantes fixas do módulo, incluindo opções de fase, status e tipos de documento.
- **`page.module.css`**: Arquivo de estilos CSS Modules específicos da página.
- **`index.ts`**: Barrel export que centraliza e re-exporta tipos, constantes e componentes do módulo para facilitar imports.
- **Service utilizado**: `services/prestacaoContasService.ts` - Contém todas as operações de banco de dados via Supabase.
- **Utilitário de upload utilizado**: `lib/uploadPdfToSupabase.ts` - Utilitário para validação e upload de arquivos PDF para o Supabase Storage.

## Fluxo Principal

1. **Carregar convênios**: Ao carregar a página, os convênios disponíveis são buscados do banco de dados.
2. **Carregar prestações**: As prestações de contas existentes são carregadas e exibidas em cartões.
3. **Adicionar bloco**: Novo cartão de prestação é adicionado à lista para criação de novo registro.
4. **Upload de PDF**: Arquivo PDF é selecionado, validado e enviado para o Supabase Storage.
5. **Salvar bloco**: Dados de um cartão específico são salvos no banco de dados.
6. **Salvar tudo**: Todos os cartões modificados são salvos em lote.
7. **Excluir bloco**: Registro específico de prestação de contas é removido do banco.

## Regras Importantes

- **Não alterar layout sem autorização**: Qualquer modificação na estrutura visual deve ser previamente aprovada.
- **Manter Supabase no service**: Todas as operações de banco de dados devem permanecer centralizadas em `prestacaoContasService.ts`.
- **Manter tipos em types.ts**: Definições de tipos devem ser mantidas no arquivo dedicado `types.ts`.
- **Manter constantes em constants.ts**: Opções fixas devem permanecer em `constants.ts`.
- **Manter upload em uploadPdfToSupabase.ts**: Lógica de upload de PDFs deve continuar no utilitário específico.