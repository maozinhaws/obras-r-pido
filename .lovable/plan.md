# Plano de Ação

Pelas fotos, percebo que o app que você está usando no celular é o **legado em `public/pintor/`** (HTML estático), e não o app React em `src/routes/`. A maioria dos meus ajustes anteriores foi feita no React — por isso você continua vendo degradê em tudo. Vou atacar onde realmente aparece.

## 1. Modo acessibilidade — só aumentar botões
**Problema:** Hoje "Reforçar contraste" e "Tamanho da fonte" mexem em fundo, cor de texto e bordas de vários componentes. Você quer que **só aumente o tamanho dos botões**.

**Ação:**
- Em `public/pintor/lovable-theme.css`, remover todos os seletores `body.contraste-alto …` que pintam fundo/borda/texto.
- Substituir `[data-fonte="grande"]` / `extra` por regras que aumentam apenas `padding`, `min-height` e `font-size` de `button`, `.cta-pill`, `.glass-brand` — sem tocar em cards, inputs, headers.
- Manter o toggle de contraste só como um leve reforço de peso de fonte nos botões (ou removê-lo do UI, se preferir).

## 2. Orçamentos não aparecem em `/orcamentos`
**Diagnóstico:** Na home aparece "Valdemir … R$ 7.500" mas a página `/orcamentos` mostra "Nenhum orçamento ainda". Provavelmente:
- A home lê de uma fonte (ex.: `localStorage` legado / IndexedDB antigo) e a página de orçamentos lê de outra (ex.: Dexie `db.orcamentos` do React).
- Ou há filtro de status escondendo tudo.

**Ação:**
- Investigar `public/pintor/index.html` (função que renderiza "Últimos Orçamentos") vs. a listagem completa.
- Unificar a fonte de dados — a listagem completa deve ler **exatamente** a mesma coleção da home.
- Confirmar com você se ambas as telas são do `public/pintor/` (legado) ou se já é pra migrar pro app React.

## 3. TODOS os botões com degradê
**Diagnóstico:** No legado `public/pintor/`, ainda existe um seletor global aplicando o gradiente quadricolor/laranja-roxo em quase todo `button`. Os ajustes que fiz antes em `lovable-theme.css` não cobriram todos os casos do HTML legado (Acessibilidade, Backup, Voltar, Salvar, miniaturas de fonte "Aa Pequeno/Médio/Grande/Extra", Importar/Baixar Backup, etc.).

**Ação:**
- Refazer a regra base: **nenhum** botão recebe degradê por padrão.
- Whitelist explícita de gradiente (laranja → roxo, igual "Novo Orçamento") apenas em:
  - `Avançar` (wizard)
  - `Salvar` (configurações)
  - `+ Criar primeiro` (orçamentos vazio)
  - `Adicionar selecionados` / confirmações principais de modais
- Todo o resto vira **secundário**: fundo branco/glass translúcido, texto escuro, borda 1–2px.
- Cards de seção (Acessibilidade, Backup) viram **superfície neutra** (glass branco), não botão colorido.
- Chips "Aa Pequeno/Médio/Grande/Extra" → fundo neutro, só o selecionado ganha borda laranja.
- WhatsApp = verde translúcido, PDF = roxo translúcido (mantém o que já estava certo).

## 4. Vincular Google Drive em Configurações > Backup
**Problema:** Só dá pra vincular Google na tela de introdução/login.

**Ação:**
- Na seção **Backup** das configurações (`public/pintor/index.html`), adicionar bloco "Google Drive":
  - Se desconectado: botão secundário **"Conectar conta Google"** (chama o mesmo fluxo OAuth da tela de intro).
  - Se conectado: mostrar e-mail conectado + botão "Desconectar" (destrutivo discreto).
- Reaproveitar a função de auth já existente no fluxo de intro — sem duplicar lógica.

## Ordem de execução
1. Investigar `public/pintor/index.html` (fontes de dados + handler Google) — 1 leitura.
2. Reescrever bloco de botões em `lovable-theme.css` (whitelist de gradiente + acessibilidade só em tamanho).
3. Corrigir fonte única de orçamentos.
4. Adicionar bloco Google Drive em Backup.
5. Validar via screenshot do preview (mobile 320px) tela por tela: Home, Orçamentos, Configurações (Acessibilidade + Backup), Novo Orçamento s1–s4.

## Pergunta única antes de executar
O app que você usa no celular é o **legado em `/pintor/`** (URL `…lovable.app/pintor/…`) ou o **React em `/`** (rotas TanStack)? As telas das fotos parecem ser do legado. Confirma pra eu focar no arquivo certo e não desperdiçar créditos mexendo no lado errado.
