## Diagnóstico

Mapeei as causas mais prováveis da lentidão percebida (preview em `/orcamentos`, mas vale para o app inteiro):

### 1. GPU sobrecarregada por efeitos "glass"
- `index.tsx` sozinho usa **7 `blur-3xl`** + várias camadas `glass`/`glass-strong` (que são `backdrop-blur`). Cada `backdrop-blur` força o navegador a recompor a árvore inteira a cada scroll/animação.
- `__root.tsx` aplica `transition-colors duration-500` no wrapper raiz → toda mudança de tema/atributo dispara transição em toda a árvore.
- Modal `NovoOrcamentoModal` empilha `backdrop-blur-md` + 2 `blur-3xl` em cima da página já blurada.

### 2. Fontes Google bloqueando render
- `__root.tsx` carrega `Inter + Syne + JetBrains Mono` (3 famílias, 7 pesos) via `<link rel="stylesheet">` síncrono no Google Fonts. Isso bloqueia o first paint e a CSS aguarda a rede mesmo offline (PWA).

### 3. `useLiveQuery` excessivo no Dashboard
- `index.tsx` dispara **5 queries Dexie** independentes (`config`, `orcamentos`, `eventos`, `clientes.count`, `aprovados.count`). Cada `db.put/update` em qualquer tabela observada dispara re-render do dashboard inteiro.
- `BottomNav` chama `useActive()` **dentro de `.map`** — viola regras de hooks só por sorte (array constante) e re-renderiza a navbar a cada mudança de rota.

### 4. Sem preload de rotas / queries
- `router.tsx` tem `defaultPreloadStaleTime: 0` e nenhum `defaultPreload: "intent"`. Navegação só começa a carregar chunk no clique.
- `routeTree.gen.ts` mostra rotas grandes (`orcamentos.novo`, `recibo`, `configuracoes`) sem code-split intencional além do automático.

### 5. Bundle não otimizado
- Importa `recharts`, `embla-carousel-react`, `vaul`, `react-day-picker`, `cmdk` no `package.json` mesmo sem serem usados nas telas atuais → entram no bundle se algum `ui/*` for importado.
- `lucide-react` está sendo importado com vários ícones por arquivo — bom, já tree-shake amigável, mantém.

---

## Plano de otimização

### A. Reduzir efeitos visuais caros (maior ganho)
1. Trocar todos os `blur-3xl` decorativos por gradientes estáticos (`bg-gradient-radial` ou simples `bg-brand/20`) — manter no máximo **1 blur por viewport**.
2. Substituir `backdrop-blur-md/xl` das `glass-strong` por `bg-surface/80` opaco. Sidebar e BottomNav ficam com fundo sólido (mais legíveis e ~10× mais baratos).
3. Remover `transition-colors duration-500` do wrapper raiz em `__root.tsx`.
4. No modal: remover os 2 `blur-3xl` internos, manter só o overlay escuro.

### B. Autohospedar fontes
1. Trocar o `<link>` do Google Fonts por `@font-face` local (ou usar `fontsource`) com `font-display: swap` e apenas pesos realmente usados (Inter 400/700, Syne 800, JetBrains Mono 400).
2. Remover os 2 `preconnect` do Google Fonts.

### C. Consolidar live queries do Dashboard
1. Unir os 5 `useLiveQuery` do `index.tsx` em **1 só** que faz `Promise.all` e retorna um objeto. Reduz re-renders e roundtrips ao IndexedDB.
2. Em `BottomNav`, calcular `pathname` uma vez com `useRouterState` e comparar dentro do `.map` (sem hook por item).
3. Em `orcamentos.tsx`, o `useLiveQuery` já refaz o filtro em memória — remover o `where("status")` duplicado e deixar só `orderBy("atualizadoEm").reverse()` (já é index).

### D. Router/preload
1. No `router.tsx`: ativar `defaultPreload: "intent"` e `defaultPreloadStaleTime: 30_000`. Hover/touch começa a baixar o chunk antes do clique.
2. Adicionar `defaultPendingMs: 100` e um `pendingComponent` global leve (skeleton) para feedback imediato.

### E. Bundle hygiene
1. Remover dependências não usadas após auditoria rápida: `embla-carousel-react`, `vaul`, `react-day-picker`, `cmdk`, `recharts`, `input-otp`, `react-resizable-panels` (confirmar 0 imports antes de remover).
2. Deletar os arquivos `src/components/ui/*` correspondentes para evitar imports acidentais.

### F. PWA / cache (bônus pequeno)
1. Conferir `manifest.webmanifest` + adicionar `Cache-Control: immutable` nos assets versionados (já é padrão do Vite, só validar build).
2. Lazy-load do `jspdf` e `jszip` — só importar dentro das funções `gerarPdfOrcamento` / backup (`await import("jspdf")`), tirando ~200KB do bundle inicial.

---

## Ordem de execução proposta

1. **A + B** (impacto visual instantâneo na fluidez)
2. **C** (re-renders)
3. **F.2** (lazy PDF/ZIP)
4. **D** (preload)
5. **E** (depende de auditoria, mais arriscado)

Etapas independentes — posso parar depois de A+B+C se quiser ver o ganho antes de mexer no resto.

## Confirmações antes de começar

- Posso **alterar o visual** removendo a maioria dos blurs (vai ficar mais "flat", menos vidro) — ok?
- Posso **autohospedar fontes** baixando os `.woff2` para `/public/fonts/`?
- Posso **remover deps não usadas** (vou listar cada uma antes de apagar)?
