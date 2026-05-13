# Módulo de Convênios

## Finalidade

Este módulo administra os convênios na área de transparência do sistema. Ele permite carregar, criar, editar, salvar e excluir registros de convênio diretamente pela interface administrativa.

## Arquivos Existentes

- `page.tsx`: Página principal do módulo, responsável pela interface, estados e coordenação das ações.
- `types.ts`: Define o tipo `Convenio` usado pelo módulo.
- `constants.ts`: Contém listas fixas de opções utilizadas nos campos do formulário.
- `conveniosService.ts`: Centraliza o acesso ao Supabase para carregamento, salvamento e exclusão de convênios.

## Fluxo Principal

1. **Carregar convênios**: Busca todos os convênios existentes e inicializa a lista de edição.
2. **Adicionar bloco**: Cria um novo bloco de convênio vazio que pode ser preenchido pelo usuário.
3. **Salvar bloco**: Salva apenas o convênio do bloco atual no banco.
4. **Salvar todos**: Itera por todos os convênios presentes na tela e salva cada um.
5. **Excluir bloco**: Remove um convênio existente ou descarta um bloco novo não salvo.

## Regras de Manutenção

- **Tipos ficam em `types.ts`**: Todas as definições de tipo do módulo devem ser mantidas neste arquivo.
- **Constantes ficam em `constants.ts`**: Listas fixas e opções de seleção devem ser mantidas separadas neste arquivo.
- **Acesso Supabase fica em `conveniosService.ts`**: Toda comunicação com o banco de dados deve ser centralizada no service.
- **`page.tsx` deve manter foco em UI e coordenação**: A página deve orquestrar ações e apresentar a interface, sem acesso direto ao Supabase ou lógica de dados avançada.
- **Não alterar layout sem autorização**: Mudanças visuais devem ser evitadas e só ocorrer com aprovação prévia.
