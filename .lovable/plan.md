# Pintor Plus — Documentação completa do app

App mobile-first para pintores autônomos gerenciarem orçamentos, clientes, agenda, fornecedores e gerar PDFs / mensagens de WhatsApp prontas. Funciona 100% offline (IndexedDB via Dexie) com tema claro como padrão (uso em campo sob sol forte) e tema escuro opcional via toggle.

---

## 1. Sistema de Design

### Tokens (src/styles.css)

- **Tipografia**: `Sora` (display/headings, 700/800) + `Manrope` (body, 400/500/600). `JetBrains Mono` para detalhes técnicos (`text-mono`).
- **Paleta** (modo claro, padrão):
  - `--background: #f4f4f6` (cinza muito claro)
  - `--card: #ffffff`
  - `--foreground: #111`, `--muted-foreground: #6b7280`, `--border: #ececef`
  - `--brand: #ff6b35` (laranja), `--brand-2: #7b5cff` (roxo), `--ink: #0a0a0a`
  - `--success #16a34a`, `--warning #f59e0b`, `--info #2563eb`, `--destructive #ef4444`
- **Paleta** (modo escuro, `[data-theme="escuro"]`):
  - `--background: #0b0d12`, `--card: #14171d`, `--secondary: #1c2027`, `--border: #262932`, `--foreground: #ededf0`
  - Brand mantida (laranja/roxo) para consistência cross-tema.
- **Radius**: 10/16/24/28/32/36/40px. Default `--radius: 20px`.
- **Acessibilidade**: `[data-fonte=pequeno|normal|grande]` muda `font-size` raiz; `[data-contraste=alto]` força preto sólido.

### Superfícies / utilitários

- `.glass` — card branco, sombra `0 8px 30px rgba(0,0,0,0.04)`, **quina viva no canto superior esquerdo** (`border-radius: 0 32px 32px 32px`).
- `.glass-strong` — variante com sombra mais densa.
- `.glass-brand` — card de destaque com **gradiente laranja → roxo**, quina viva no canto superior direito (`36px 0 36px 36px`), texto branco, `box-shadow: 0 20px 50px -15px rgba(123,92,255,0.35)`.
- `.glass-brand-glow` — adiciona halo gradiente desfocado atrás (blur 22px, opacity 0.22).
- `.glass-press` — micro-interação `active:scale(0.98)` em 150ms.
- `.btn-dark` — pill primário preto (`#0a0a0a`, branco, `rounded-full`, padding `12px 24px`, bold). No modo escuro vira pill claro `#ededf0`.
- Helpers legacy: `.brutal-border`, `.brutal-shadow`, `.brutal-press` (mantidos pelas telas internas; herdam tokens novos).
- `.no-scrollbar` para faixas horizontais (métricas pill, tabs de ambiente).

### Inputs (estilo Lovable, themeáveis)

| Estado | Modo claro | Modo escuro |
|---|---|---|
| Vazio / sem foco | fundo `#ffffff`, fonte `#0a0a0a` | fundo `#2a2f38`, fonte branca |
| **Em foco** | fundo `#ffffff`, fonte `#0a0a0a`, borda laranja + **glow** `0 0 0 3px brand@28%` | idem (igual ao claro) |

Transições 150ms em `background-color, color, border-color, box-shadow`. Sem ring azul nativo (`outline: none`).

### Botões

- **Hero CTA** (dashboard): card `.glass-brand` grande, ícone `+` em pill `bg-card/20 backdrop-blur`, badge "Toque para iniciar" em pill preto translúcido, headline Sora 3xl uppercase.
- **Primário escuro** (`.btn-dark`): pill preto, usado em estados vazios ("Criar Primeiro").
- **Sidebar nav rows**: `rounded-lg`, `text-sm font-medium`, border 1px. Ativo: `bg-secondary text-foreground border-border`. Inativo: `text-muted-foreground hover:bg-secondary/60 border-transparent`.
- **Pills de métrica** (`MetricPill`): `bg-card`, border, `rounded-full`, dot colorido + label semibold.
- **Tabs / chips** ("+ Sala", "+ Cozinha"): `brutal-border-thin`, uppercase 10px tracking widest. Ativo recebe `bg-brand text-ink`.
- **shadcn `<Button>`** (`src/components/ui/button.tsx`): variants `default` (primary preto), `outline`, `secondary`, `ghost`, `destructive`, `link`. Sizes `sm/default/lg/icon`.

### Cards principais

- **Card lista de orçamento** (linha no Fluxo): pill `bg-muted/50`, avatar gradiente `$`, nome cliente bold, status + data uppercase muted, total em Sora à direita.
- **Card de agenda**: `.glass`, dot status (laranja se evento próximo, verde se livre), título Sora xl uppercase, ícone Calendar grande em pill cinza à direita.
- **Modal "Tipo de Orçamento"**: bottom-sheet em mobile, centralizado em desktop, `rounded-[32px]`, lista de 3 modos cada um em pill `bg-muted/50` com avatar gradiente do ícone.

### Layout shell

- **Sidebar** (`Sidebar`) — fixa em desktop, drawer em mobile. Logo P+ gradiente. Seções "Principal" (Dashboard, Orçamentos, Clientes, Agenda) e "Sistema" (Fornecedores, Backup, Configurações, Termos). CTA flutuante "Novo Orçamento" no rodapé com gradiente brand. Suporta modo collapsed (md:w-20 com tooltips).
- **MenuButton** — fixo top-left mobile (`size-11`, `bg-card`, sombra suave).
- **ThemeToggle** — fixo top-right, alterna `data-theme="claro|escuro"` no `<html>`.
- **PageHeader** — eyebrow uppercase tracking + título Sora 2xl/4xl, slot `actions` à direita, fundo `bg-card/60` com border-bottom.

---

## 2. Mapa de Rotas

| Rota | Arquivo | Função |
|---|---|---|
| `/` | `routes/index.tsx` | Dashboard: métricas, CTA novo orçamento, fluxo recente, próximo evento. |
| `/orcamentos` | `orcamentos.tsx` + `orcamentos.index.tsx` | Lista filtrável por status, busca por cliente. |
| `/orcamentos/novo?modo=flash\|foto\|detalhado` | `orcamentos.novo.tsx` | Wizard de criação (ver §3). |
| `/orcamentos/$id` | `orcamentos.$id.tsx` | Detalhe + ações (editar, PDF, WhatsApp, mudar status, histórico). |
| `/orcamentos/$id/recibo` | `orcamentos.$id.recibo.tsx` | Versão recibo (impressão). |
| `/clientes` | `clientes.tsx` | CRUD de clientes, busca, snapshot usado em orçamentos. |
| `/agenda` | `agenda.tsx` | Eventos por data (visitas, execuções). |
| `/fornecedores` | `fornecedores.tsx` | CRUD fornecedores + categorias. |
| `/backup` | `backup.tsx` | Export/import JSON do IndexedDB. |
| `/configuracoes` | `configuracoes.tsx` | Perfil do pintor, ambientes/materiais/serviços padrão, tema, fonte, contraste. |
| `/mais` | `mais.tsx` | Hub secundário mobile. |
| `/termos` | `termos.tsx` | Termos legais. |

Persistência: **Dexie/IndexedDB** (`src/lib/db.ts`) — tabelas `config`, `clientes`, `orcamentos`, `eventos`, `fornecedores`, `fotos`. Fotos comprimidas para 1600px max e guardadas como Blob (`src/lib/fotos.ts`).

---

## 3. Os três modos de criar orçamento

O modal "Tipo de Orçamento" abre via CTA do dashboard ou rota `/orcamentos/novo?modo=…`. Cada modo usa o mesmo wizard com passos e telas diferentes, e o mesmo autosave (debounced 1500ms via `persistOrcamento`).

### Stepper comum

- **Detalhado**: 4 passos — `Cliente → Ambientes → Pagamento → Revisão`.
- **Flash / Foto**: 3 passos — `Cliente → Itens → Revisão` (pagamento é editado na revisão).
- Barra de progresso superior: 4 segmentos `h-2.5 rounded-full`, ativos com `.glass-brand` (gradiente laranja→roxo).
- Botão "X" no header confirma saída ("rascunho fica salvo" — autosave já gravou).

### Passo Cliente (compartilhado)

- Busca incremental por nome/telefone na tabela `clientes`.
- Selecionar cliente grava `clienteSnapshot` no orçamento (nome, telefone, endereço congelados no momento — alterações futuras no cliente não retroagem).
- Botão "Novo cliente" abre form inline (`Field` reutilizado de `routes/clientes.tsx`).

### 3.1 Modo Flash (`?modo=flash`) — rápido e prático

- **Objetivo**: orçar na hora, sem subdividir ambientes.
- Cria automaticamente **1 ambiente "Geral" implícito**; tela mostra apenas "X itens adicionados".
- Lista de itens em pills `bg-surface brutal-border-thin`: nome + dimensões (`altura × comprimento`) à esquerda, preço Sora laranja à direita. Toque abre o `ItemEditor`.
- CTA grande `.glass-brand` "Adicionar item" abre editor fullscreen.
- `ItemEditor` (sheet fullscreen `bg-midnight`): nome do item, serviços (chips multi-select de `SERVICOS_PADRAO`), preço, dimensões opcionais, observação. Footer com "Salvar" / "Excluir".
- Revisão pula direto pra forma de pagamento + total agregado.

### 3.2 Modo Foto (`?modo=foto`) — análise por imagem

- **Objetivo**: documentar com fotos cada parede/superfície antes de orçar.
- Ambiente "Geral" criado por padrão; usuário pode adicionar ambientes (Sala, Cozinha, Banheiro…) como chips/tabs (`ambientesPadrao` vem de `db.config`).
- Tabs horizontais mostram ambientes existentes com contador (`Sala · 3`). Toque troca `ambienteAtivoId`.
- **CameraModal** abre automaticamente ao entrar no passo (`autoOpenCamera`).
  - Usa `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`, prefere câmera traseira.
  - UI: viewfinder full-screen, **VerticalZoom** (slider lateral), botão capture grande circular, thumbs das fotos já tiradas, botão "Pronto" para confirmar lote.
  - Cada captura é convertida em Blob JPEG ~85%, comprimida para 1600px max, salva via `salvarFoto` retornando `id` (UUID).
- Cada foto vira **1 item** do ambiente ativo com `nome: "Parede"`, `preco: 0`, `fotos: [fotoId]`.
- Cards de item exibem thumbnail; toque abre `ItemEditor` para preencher serviços/preço/dimensões. Indicador "X pendentes" enquanto houver itens sem preço.
- Editor de foto (`PhotoEditor`): crop, rotate, marcação. Substitui a foto original.

### 3.3 Modo Detalhado (`?modo=detalhado`) — relatório completo

- **Objetivo**: orçamento profissional com múltiplos ambientes e relatório.
- Passo Ambientes: chips `+ Sala / + Quarto / …` para adicionar (vindos de `config.ambientesPadrao` ou `AMBIENTES_PADRAO`). Cada ambiente vira um card `bg-surface brutal-border`:
  - Nome editável inline (input transparente Sora italic).
  - Botão "Itens (N)" abre `ItensModal` em fullscreen para gerenciar a lista.
  - Botão lixeira (com confirm) remove ambiente.
  - Resumo dos itens já cadastrados listado abaixo (nome + preço).
- `ItensModal`: lista de itens com mesmo `ItemEditor`. Serviços e materiais sugeridos vêm de `SERVICOS_PADRAO` / `MATERIAIS_PADRAO`.
- Passo Pagamento: forma de pagamento (`FORMAS_PAGAMENTO` — dinheiro, PIX, cartão, parcelado…), data prevista de início, validade do orçamento, observações, formato da mensagem (`completo` / `resumido`).
- Passo Revisão: totais por ambiente, total geral (`calcularTotal`), CTAs:
  - **Gerar PDF** (`gerarPdfOrcamento` → `baixarBlob`).
  - **Enviar WhatsApp** (`gerarMensagemWhatsapp` + `whatsappLink` → abre `wa.me/...`).
  - Botão fechar/confirmar grava status `enviado`.

### Histórico e status

Cada gravação compara o orçamento anterior e gera entradas no `historico` (`buildHistoricoEntries` em `src/lib/orcamentos.ts`): mudanças de cliente, pagamento, itens, status — visíveis no detalhe do orçamento. Statuses: `rascunho → enviado → aprovado / recusado → finalizado` (labels em `STATUS_LABELS`).

---

## 4. Câmera (`src/components/camera-modal.tsx`)

- **Permissões**: pede `getUserMedia` com `facingMode: "environment"`. Fallback para câmera frontal se a traseira falhar.
- **Lifecycle**: stream parado no unmount (`stream.getTracks().forEach(t => t.stop())`).
- **UI**:
  - Header preto com X (esquerda) e contador "X fotos".
  - Viewfinder ocupa 100% (preto, `object-cover`).
  - Slider vertical de zoom (`VerticalZoom`) à direita quando o track suporta `zoom`.
  - Botão capture: círculo grande branco com borda dupla, `active:scale-95`.
  - Strip horizontal inferior com `Thumb` de cada foto já capturada (toque para revisar/remover).
  - Botão "Pronto" no rodapé devolve `fotoIds[]` para o caller.
- **Revisão pré-confirmação** (`ReviewImage`): exibe foto em fullscreen com botão "Remover".

---

## 5. Geração de saídas

- **PDF** (`src/lib/pdf.ts`): monta documento com cabeçalho do pintor (config), dados do cliente snapshot, ambientes/itens/preços, totais, forma de pagamento, validade, observações, logo. Suporta formato "completo" e "resumido". Download via `baixarBlob`.
- **WhatsApp**: gera texto plain/emoji com mesmas seções. Link `wa.me/<telefone>?text=...`. Telefone sanitizado em `whatsappLink`.
- **Recibo** (`/orcamentos/$id/recibo`): versão print-friendly só com cabeçalho + total.

---

## 6. Backup / Configurações

- **Backup**: exporta JSON com `config`, `clientes`, `orcamentos`, `eventos`, `fornecedores` (fotos viram base64). Import substitui todas as tabelas (com confirm).
- **Configurações**: edita perfil do pintor (nome, telefone, CNPJ, logo), listas padrão (ambientes, materiais, serviços), preferências de tema (`claro`/`escuro`), tamanho de fonte (`pequeno`/`normal`/`grande`) e contraste alto.

---

## 7. Princípios de UX aplicados

1. **Mobile-first, max-w-md** no dashboard e modais — feito pra polegar.
2. **Modo claro padrão** — uso em campo sob sol; modo escuro é opcional via toggle.
3. **Quina viva nos cards** — assinatura visual (top-left nos brancos, top-right nos brand) que diferencia das soluções genéricas SaaS.
4. **Glow laranja no foco de inputs** — feedback claro mesmo com luva/dedo grosso, sem azul nativo.
5. **Autosave em rascunho** — pintor nunca perde dado se atender cliente no meio do orçamento.
6. **Snapshot do cliente** — orçamentos antigos não mudam se o cliente for editado depois.
7. **Offline-first** — tudo IndexedDB; sem backend obrigatório.

---

## Fora de escopo (futuro)

- Sincronização entre dispositivos (precisaria Lovable Cloud).
- Login / multi-usuário.
- Cálculo automático de tinta por m² baseado em rendimento do produto.
- Galeria de portfólio pública.
