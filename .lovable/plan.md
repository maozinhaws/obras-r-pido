# Redesign: Tema Claro Minimalista

Migração completa do tema escuro neon/neumórfico atual para um tema claro minimalista mobile-first, com cards brancos flutuantes e um único card gradiente vibrante como destaque — exatamente a direção "Soft minimalist mobile" aprovada.

## O que muda visualmente

- **Fundo**: cinza claro `#f4f4f6` (sem gradientes radiais coloridos atrás)
- **Cards**: branco puro, cantos `rounded-[32px]`, sombra `0 8px 30px rgba(0,0,0,0.04)`, borda `border-gray-100`
- **Card de destaque (CTA Novo Orçamento)**: gradiente `from-[#ff6b35] via-[#ff6b35] to-[#7b5cff]`, `rounded-[36px]`, glow sutil atrás, ícone em pill `bg-white/20 backdrop-blur`
- **Botão primário**: preto `#0a0a0a`, pill `rounded-full`, texto branco bold
- **Tipografia**: Sora (display/headings) + Manrope (body) — instalados via `@fontsource`
- **Inputs**: brancos, borda `#e5e7eb`, foco com ring violeta
- **Texto**: `#111` títulos, `#6b7280` secundário, `#9ca3af` placeholder

## Arquivos a alterar

### 1. `src/styles.css` — reescrever bloco de tema

- Remover o bloco grande "DARK NEUMORPHIC + LIQUID GLASS" (linhas ~322–537) inteiro
- Resetar tokens `:root` para tema claro:
  - `--background: #f4f4f6`, `--foreground: #111111`
  - `--card: #ffffff`, `--card-foreground: #111111`
  - `--brand: #ff6b35`, `--brand-2: #7b5cff` (novo)
  - `--ink: #0a0a0a`, `--muted-foreground: #6b7280`
  - `--border: #f0f0f2`, `--radius: 20px`
- Remover background-image radial colorido do `body`
- Reescrever utilitários:
  - `.glass` → card branco com sombra suave (não translúcido)
  - `.glass-strong` → card branco com sombra média
  - `.glass-brand` → gradiente laranja→violeta, texto branco
  - `.glass-press` → mantém active:scale-[0.98]
- Reset agressivo dos `button:not([data-skeu-skip])...` global → remover (estava forçando estilo escuro em tudo)
- Inputs voltam para estilo neutro claro
- Fontes: `--font-display: 'Sora'`, `--font-sans: 'Manrope'`

### 2. Fontes — instalar `@fontsource/sora` e `@fontsource/manrope`

```bash
bun add @fontsource/sora @fontsource/manrope
```

Importar em `src/router.tsx` ou `src/routes/__root.tsx`:
```ts
import '@fontsource/sora/700.css'
import '@fontsource/sora/800.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
```

### 3. `src/routes/index.tsx` — reconstruir dashboard

Substituir o "Performance Hub" pelo layout exato da direção v1:
- container `max-w-md mx-auto space-y-6 py-8 px-4`
- Header: eyebrow "Painel · System Active" + h1 "Performance Hub" em Sora extrabold
- Linha de métricas inline: pills brancas com dot colorido (faturamento laranja, clientes violeta)
- Card CTA gradiente grande com ícone "+" em pill translúcido e texto "Novo Orçamento" → linka para `/orcamentos/novo`
- Card "Fluxo de Orçamentos": branco, estado vazio centralizado com ícone cinza + botão preto pill "Criar Primeiro"
- Card "Agenda Livre": branco, layout horizontal com ícone à direita

### 4. `src/components/app-shell.tsx` — adaptar shell para tema claro

- Sidebar/topbar com fundo branco ou `#fafafa`, borda fina
- `PageHeader`: título em Sora preto, eyebrow cinza médio
- Botões de ação no header: variant preto pill ou gradient brand
- Remover qualquer `glass` escuro residual

### 5. Listagens (`orcamentos.index.tsx`, `clientes.tsx`, etc.)

Pequenos ajustes só para garantir que cards `.glass` e botões `.glass-brand` continuem fazendo sentido com os novos tokens. Sem reescrever as rotas — herdam o tema novo automaticamente via classes utilitárias.

## Detalhes técnicos

- `tailwind.config` não precisa mexer — `font-display` e `font-sans` vêm via tokens CSS já mapeados em `@theme inline`
- Manter compatibilidade com temas alternativos (`data-theme="brutalista"`/`"minimalista"`) — apenas atualizar o default `:root`
- Manter classes utilitárias `.brutal-border*`, `.text-display`, `.text-mono` (usadas em várias rotas) mas reajustar cores
- Remover overrides `!important` agressivos de buttons/inputs globais — eles estavam forçando visual escuro em todo elemento

## Fora de escopo

- Não redesenhar telas internas individuais (orcamentos/novo, clientes, agenda) — herdam tema novo automaticamente; ajustes pontuais podem vir depois se algo destoar
- Não mexer em lógica de negócio, db ou rotas
