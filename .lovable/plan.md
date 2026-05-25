## Contexto

As 5 tarefas têm impacto e complexidade muito diferentes. O app vive em dois arquivos gigantes (`public/pintor/index.html` e `app.html`, ~7.400 linhas cada), com boa parte do Flash dentro de um `iframe[data-srcdoc]`. Vou organizar em **4 ondas** por prioridade (impacto × risco), confirmar uma dúvida sobre a tarefa 4 e executar.

## Prioridades

| # | Tarefa | Prioridade | Por quê |
|---|--------|------------|---------|
| 2 | Dashboard com gráficos | **P0** | Promete entregue mas só tem markup, sem JS de render |
| 1 | Câmera personalizada | **P0** | Funcionalidade quebrada, bloqueia uso real em campo |
| 3 | Modais centralizados + glass | **P1** | Inconsistência visual, mas app funciona |
| 5 | Botões fora do padrão | **P1** | Polimento visual |
| 4 | Prefixo `MT_`/`SV_` no DB | **P2** | Mudança estrutural com risco de quebrar dados existentes |

## Onda 1 — Dashboard funcional (P0)

A página `#pg-dashboard` já existe (index.html L2567+) com KPIs, filtros de período e 3 contêineres de gráfico vazios. Falta a lógica.

- Adicionar `renderDashboard()` que:
  - Lê `orcamentos` do IndexedDB/localStorage
  - Filtra pelo range ativo (7/30/90/365/tudo + custom DE/ATÉ)
  - Calcula KPIs: total emitidos, receita total, ticket médio, taxa de conversão
  - Renderiza 3 gráficos SVG inline (sem dependência externa):
    - Emissões por dia (linha)
    - Receita por mês (barras)
    - Distribuição por status (donut)
- Wire-up `dashSetRange()`, `dashCustomRange()`, e auto-render ao abrir a tab
- Replicar nos dois arquivos

## Onda 2 — Câmera (P0)

Sintoma: abre o seletor de arquivos em vez da câmera. O código tem `getUserMedia` mas o iframe pode não estar recebendo permissão. Investigar:

- Confirmar `allow="camera; microphone"` no iframe (já tem L2609)
- Verificar se `sandbox` está bloqueando (allow-same-origin já está)
- O `input[type=file] accept="image/*"` está sendo acionado como fallback automático — descobrir se a Promise de `getUserMedia` está rejeitando silenciosamente
- Garantir HTTPS no preview (sandbox usa HTTPS, ok)
- Testar no preview com browser tool e ler console do iframe

## Onda 3 — Modais centralizados + glassmorphism (P1)

- Atualizar `.modal-overlay` para `align-items:center` (hoje é `flex-end`)
- Aplicar `.glass` / `.glass-strong` (já existe no design system) em todos os `.modal-sheet`, `.modal-glass`, sheets do PWA, picker, etc.
- Garantir cantos arredondados 28-32px conforme memória do projeto
- Sweep nos dois arquivos

## Onda 4 — Botões fora do padrão (P1)

Auditar e padronizar:
- CTAs principais → `.cta-pill` (gradiente quadricolor)
- Secundários → `.glass` com borda
- Destrutivos → vermelho semantizado
- Remover `style=` inline duplicado por classes

## Onda 5 — Prefixo MT_/SV_ (P2) — **precisa de confirmação**

Esta mexe no schema de dados. Antes de executar, preciso confirmar:

**Pergunta:** os orçamentos já salvos em IndexedDB de usuários reais devem ser migrados automaticamente (script que renomeia chaves existentes na primeira abertura), ou só novos cadastros recebem o prefixo? E o prefixo deve aparecer só internamente (chave/ID) ou também no texto exibido?

Vou executar 1→4 e só depois fazer a 5 com a confirmação.

## Verificação

Ao final de cada onda: abrir o preview, conferir visualmente, ler console por erros. Reportar progresso entre ondas.
