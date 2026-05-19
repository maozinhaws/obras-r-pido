## Adicionar toque de neumorfismo (sutil)

Adicionar profundidade neumórfica leve ao tema atual sem perder a estética soft minimalista. A ideia: sombras duplas (clara em cima/esquerda + escura embaixo/direita) nos cards e botões, mantendo cantos "vivos" (top-left reto nos cards brancos, top-right reto no card gradiente) e a paleta atual.

### Mudanças

**1. `src/styles.css` — novas variáveis e utilitários**

Adicionar tokens de sombra neumórfica para claro e escuro:
- Claro: `--neu-light: rgba(255,255,255,0.9)` / `--neu-dark: rgba(180,180,200,0.35)` / superfície base ligeiramente off-white
- Escuro: `--neu-light: rgba(255,255,255,0.04)` / `--neu-dark: rgba(0,0,0,0.55)`

Atualizar `.glass` e `.glass-strong`:
- Sombra dupla: `box-shadow: -6px -6px 14px var(--neu-light), 8px 10px 24px var(--neu-dark)`
- Borda mais sutil (`border-color: transparent` ou cor muito leve)
- Manter `border-radius: 0 32px 32px 32px` (canto vivo top-left)

Novo utilitário `.neu-inset` para áreas pressionadas (campos, estados ativos):
- `box-shadow: inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)`

Atualizar `.btn-dark` e `.glass-press`:
- Adicionar sombra neumórfica suave em repouso
- No `:active`, inverter para `inset` (efeito de pressionar de verdade)

Card gradiente `.glass-brand`:
- Manter, só somar uma sombra extra mais difusa para parecer "flutuando" mais
- Não aplicar inset (cor sólida estraga o efeito)

**2. Inputs**
- Trocar borda fina por `.neu-inset` leve para parecer "afundado" na superfície
- Foco mantém o ring violeta atual

**3. Sidebar / botões de menu (`src/components/app-shell.tsx`)**
- Item ativo: `.neu-inset` em vez de fundo sólido
- Itens em repouso: relevo neumórfico suave no hover

**4. `ThemeToggle`**
- Aplicar mesmo relevo neumórfico (já usa `glass-press`, herda automaticamente)

### Fora do escopo
- Não mexer no layout, rotas ou tipografia
- Não trocar paleta (laranja/violeta/preto continuam)
- Cantos vivos permanecem como combinado

### Resultado visual
Cards parecem "esculpidos" da superfície de fundo (efeito 3D suave), botões afundam ao pressionar, inputs parecem entalhes. Mantém minimalismo — sem gradientes coloridos extras, só luz e sombra.
