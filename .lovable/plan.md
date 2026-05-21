
# Refatorar modo claro/escuro — uma página por vez

## Problema
Modo claro e escuro estão quase idênticos — só a cor da fonte muda. Motivo: a Home (`src/routes/index.tsx`) usa **cores hard-coded inline** (`#0b0d12`, `rgba(20,23,29,0.5)`, `rgba(255,255,255,0.06)`, `text-white`, etc.) em vez de tokens semânticos do design system. O `ThemeToggle` adiciona/remove a classe `.dark`, mas como os estilos não usam `var(--background)` / `var(--foreground)` / `var(--card)`, nada muda visualmente.

Além disso, o **default é fundo escuro fixo** (gradiente radial preto), o que contradiz a regra de memória: *"Modo claro é o padrão e mais usado (uso em campo sob sol forte)"*.

## Estratégia
Fazer **uma página por vez**, começando pela **Home** (`/`). Só avançar para a próxima página depois que o usuário aprovar o resultado da Home.

## Escopo desta rodada: APENAS Home (`src/routes/index.tsx`)

### O que muda
1. **Trocar fundo fixo escuro por tokens responsivos ao tema**
   - Claro: fundo claro neutro (off-white quente, alto contraste para sol) com gleams sutis laranja/roxo.
   - Escuro: o fundo atual (gradiente radial laranja→roxo→preto).
   - Implementar via `var(--bg-hero)` definido em `src/styles.css` para `:root` e `.dark`.

2. **Substituir cores inline por tokens semânticos**
   - `text-white` → `text-foreground`
   - `text-white/60`, `text-white/55` → `text-muted-foreground`
   - `rgba(20,23,29,0.5)` (cards glass) → `var(--card)` + `var(--card-border)` com opacidade ajustada por tema
   - `rgba(255,255,255,0.06)` (pills, item rows) → `var(--surface-2)`
   - `#a78bfa` (links Histórico/Ver agenda) → `var(--brand-2)` ou `text-accent`

3. **Manter intacto**
   - O CTA Hero "Novo Orçamento" (gradiente laranja→roxo) — fica igual nos dois modos, é a identidade da marca.
   - Estrutura, layout, animações, ícones, copy.
   - Toda a lógica (modal, query Dexie, navegação).

4. **Garantir contraste em sol forte (modo claro)**
   - Texto principal: preto puro (`#0a0a0a`).
   - Bordas dos cards: 1.5px sólidas escuras (não translúcidas).
   - Pills de métrica: fundo branco sólido, borda escura.
   - Linhas de orçamento: fundo branco, borda slate-300.

### Tokens novos em `src/styles.css`
Adicionar (sem quebrar o existente):
```css
:root {
  --bg-hero: radial-gradient(80% 50% at 50% 0%, rgba(255,107,53,0.08), transparent 70%),
             radial-gradient(60% 50% at 100% 100%, rgba(123,92,255,0.08), transparent 70%),
             #faf8f5;
  --card-solid: #ffffff;
  --card-border-strong: #cbd5e1;
  --surface-2: #f1f5f9;
}
.dark {
  --bg-hero: radial-gradient(80% 50% at 50% 0%, rgba(255,107,53,0.5), transparent 70%),
             radial-gradient(60% 50% at 100% 100%, rgba(123,92,255,0.6), transparent 70%),
             #0b0d12;
  --card-solid: rgba(20,23,29,0.5);
  --card-border-strong: rgba(255,255,255,0.08);
  --surface-2: rgba(255,255,255,0.06);
}
```

### Não-objetivos (próximas rodadas)
- `/orcamentos/novo`, `/orcamentos`, `/agenda`, `/clientes`, `/configuracoes`, `/mais` — ficam para depois.
- Não vou mexer no `ThemeToggle`, nem na regra global de inputs brancos (já validada).

## Como saberemos que ficou bom
- Alternar o toggle ☀️/🌙 muda visivelmente fundo, cards e bordas — não só texto.
- No modo claro, a tela é legível sob luz solar simulada (alto contraste, sem translucidez fraca).
- No modo escuro, mantém o visual atual de glass premium.

## Próximos passos
Aprovar este plano → implemento só a Home → você valida nos dois modos → escolhemos a próxima página (sugiro `/orcamentos/novo` por ser a mais usada em campo).
