# Plano de correções

## 1) Modal de item unificado entre Flash e Detalhado

Hoje cada modo tem uma UI própria para o item:

- Detalhado: `ItemEditor` embutido em `src/routes/orcamentos.novo.tsx` (modal "Detalhes do Item" com sheets de Sugestões e Serviços).
- Flash: linhas inline com inputs `nome + preço` direto em `src/routes/flash.tsx`.

**Ação:**

- Extrair `ItemEditor` para um componente compartilhado `src/components/item-editor-modal.tsx` (mesma estrutura: Nome com sugestões, Largura/Altura, Fotos, Observação/Serviços, Preço).
- Aceitar prop `mode: "flash" | "detalhado"` apenas para:
  - Flash: ocultar `Largura/Altura`, `Serviços` e `Observação` (mantém Nome, Preço, Fotos — "mesmas ferramentas" mas formulário menor).
  - Detalhado: tudo visível.
- `flash.tsx` passa a abrir o mesmo modal ao tocar em "Adicionar item" / linhas; remove inputs inline.
- `orcamentos.novo.tsx` passa a importar o componente extraído (sem mudança visível).

## 2) Bug do teclado mobile (botões só aparecem ao clicar fora)

O footer fixo (`position: fixed bottom-0`) fica sob o teclado virtual no Android. Quando o teclado fecha por gesto (não por blur), o `resize` do layout viewport não dispara, então o footer só "reaparece" no blur.

**Ação em `src/styles.css`:**

- Adicionar listener leve via `VisualViewport`: ouvir `resize` do `window.visualViewport` e setar `--kb-inset` no `<html>` com o offset do teclado.
- Footer fixo usa `bottom: var(--kb-inset, 0px)` para subir/descer junto.
- Pequeno hook `useVisualViewportInset()` em `src/hooks/use-vv-inset.ts` registrado no `__root.tsx` (uma vez).

## 3) Tema roxo nos campos de item

No `ItemEditor` os "botões-campo" (Nome do item / Observação) e inputs hoje têm borda `slate-300` e foco laranja. Trocar para roxo (`brand-2`) conforme logotipo:

- Borda dos campos do item: `border-brand-2/40`.
- Texto de label/valor selecionado: tom `brand-2` quando ativo, preto/cinza quando inativo (mantém legibilidade ao sol).
- Glow do input em foco:
  - Modo claro → glow roxo (`brand-2`).
  - Modo escuro → glow laranja (`brand`).
- Implementação centralizada em `src/styles.css` (`input:focus`, `.field-card`).

## 4) Footer dos botões cancelar/avançar igual ao Flash

Hoje no Detalhado o `ItemEditor` usa `brutal-border-thin` + cor `bg-brand` (amarelo/laranja). Padronizar pelo mesmo padrão do Flash:

- Mesma ordem: `[ Excluir ] [ Cancelar ] [ Salvar/Avançar ]`.
- Mesmas classes (`glass`, `glass-brand`, `glass-press`, pílulas arredondadas) — só muda a cor do CTA principal por modo (roxo no claro / laranja no escuro, via token).
- Aplicar também no stepper do `orcamentos.novo.tsx` (etapa 1) já que o usuário citou avançar/voltar.

## 5) Proteção contra fechamento acidental

Sintomas no print: existe um `X` flutuante no topo-esquerdo (fora do card) que fecha a página enquanto o modal "Novo item" está aberto, perdendo dados.

**Ação:**

- Quando qualquer modal de item/sugestões estiver aberto, renderizar overlay `fixed inset-0 z-[60]` que captura cliques e bloqueia o conteúdo de fundo (`pointer-events-none` no main).
- Esconder o `X` global da página enquanto o modal está aberto (ou desabilitá-lo).
- Mover todos os botões `X` de fechar para a **direita** do header do card (já é o padrão da maioria; revisar o stepper da página de orçamento que tem o `X` à esquerda).
- O único `X` que aparece com modal aberto é o do próprio modal (canto superior direito).

## Arquivos afetados

- `src/components/item-editor-modal.tsx` (novo, extraído de `orcamentos.novo.tsx`)
- `src/routes/orcamentos.novo.tsx` (usar componente extraído, mover X do header, footer padronizado, bloquear fundo)
- `src/routes/flash.tsx` (abrir o mesmo modal ao adicionar item)
- `src/hooks/use-vv-inset.ts` (novo)
- `src/routes/__root.tsx` (registrar hook)
- `src/styles.css` (variável `--kb-inset`, focos roxo/laranja, classe `.field-card` roxa)

## Observações

- Mantenho a lógica de persistência intacta (forms, validação, fotos via Dexie). Só refatoro UI/UX.
- Não toco em `public/pintor/*` (app HTML legado) — as correções são na app React (rotas `/flash` e `/orcamentos/novo`).
