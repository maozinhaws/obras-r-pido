# Pintor Plus — Plano e System Design

## Visão geral

App **mobile-first, 100% offline-local** para pintores e pequenos prestadores de obra. Foco: criar orçamentos no canteiro de obra em segundos, sem depender de internet, sem cadastro, sem nuvem.

- **Plataforma**: PWA instalável (TanStack Start + Vite, renderiza como SPA no cliente).
- **Persistência**: Dexie/IndexedDB local. Zero Supabase, zero backend remoto. Backup manual via export/import JSON+ZIP.
- **Idioma**: PT-BR.
- **Performance**: prioridade absoluta no mobile.

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | TanStack Start v1 + TanStack Router (file-based) |
| Build | Vite 7 |
| UI | React 19, Tailwind v4, shadcn/ui (parcial) |
| Estado servidor | TanStack Query (apenas para integração com Dexie via live queries) |
| Dados | Dexie 4 (IndexedDB), `dexie-react-hooks` (`useLiveQuery`) |
| PDF | jsPDF (lazy import) |
| Backup | jszip (lazy import) |
| Câmera | `getUserMedia` + `ImageCapture` (torch hardware) |
| Editor de foto | Canvas 2D nativo (sem libs externas) |

---

## Modelo de dados (Dexie — `src/lib/db.ts`)

### Tabelas

- **clientes** — `id, nome, telefone, email, documento, endereço, apelido, criadoEm`
- **fornecedores** — `id, nome, telefone, categoria, observação, criadoEm`
- **orcamentos** — núcleo do app. Campos:
  - `clienteId`, `clienteSnapshot` (cópia inline do cliente no momento)
  - `ambientes: Ambiente[]` — cada ambiente tem `itens: ItemAmbiente[]`
  - `ItemAmbiente`: `id, nome, altura, comprimento, servicos[], materiais[], preco, observação, fotos[]`
  - `formaPagamento, validade, inicio, tipoServico, observações`
  - `formatoMensagem`: `"completo" | "area" | "simples"` (controla WhatsApp/PDF)
  - `totalManual, precoAdicionalM2, pagadorDiferente, pagadorNome/Telefone/Endereco`
  - `historico: HistoricoOrcamentoEntry[]` — log auditável
  - `status: StatusOrcamento` (`rascunho|enviado|aprovado|em_andamento|finalizado|cancelado`)
  - `criadoEm, atualizadoEm`
- **fotos** — `id, blob (Blob), criadoEm` (armazena Blob original; thumbs via `URL.createObjectURL`)
- **eventos** — agenda (`titulo, data ISO, hora, observação, orcamentoId`)
- **recibos** — `orcamentoId, valor, data, formaPagamento, observação`
- **config** — singleton (`id=1`): empresa, logo, assinatura, mensagem padrão WhatsApp, listas customizadas (`servicosPadrao, flashServicos, flashMateriais, materiaisPadrao, formasPagamento, ambientesPadrao`), tema/contraste/fonte.

### Persistência com log automático

`src/lib/orcamentos.ts → persistOrcamento(next, { forceLog? })`:
1. Lê snapshot anterior do Dexie.
2. Faz `diff` campo a campo (cliente, pagamento, datas, itens, ambientes, observações, status).
3. Anexa `HistoricoOrcamentoEntry[]` (id, timestamp, descrição amigável tipo `Alterado Nome do item de "X" para "Y"`).
4. Faz `db.orcamentos.put` com `atualizadoEm = Date.now()`.

`updateStatusWithLog(id, status)` é o atalho para mudança de status com log.

---

## Funcionalidades

### 1. Dashboard (`/`)
- Cards: total de clientes, orçamentos aprovados, próximos eventos, faturamento estimado.
- Atalho rápido: **Novo orçamento** → abre modal com 3 modos (Flash / Foto / Detalhado).
- Lista dos últimos orçamentos.

### 2. Orçamentos
- `/orcamentos` — lista filtrável por status, ordenada por `atualizadoEm`. Cada card permite mudar status (com log).
- `/orcamentos/novo?modo=flash|foto|detalhado&editId?&draftKey?`
  - **Flash** (3 passos): Cliente → Itens (ambiente implícito "Geral", chips de serviços/materiais configuráveis) → Revisão.
  - **Foto** (3 passos): Cliente → Itens (câmera abre automaticamente, cada foto vira item) → Revisão.
  - **Detalhado** (4 passos): Cliente → Ambientes (escolhe presets ou cria) → Pagamento → Revisão.
  - `draftKey` força state limpo entre invocações (resolve botão "preso" da dashboard).
  - Nome do item, ambiente, observações são editáveis inline.
  - Revisão tem: data prevista de início, formato de mensagem (completo/área/simples), observações globais.
- `/orcamentos/$id` — detalhe + ações:
  - **Botão Histórico** (ícone `ScrollText` no topo) abre overlay com log auditável: `DD-MM-AA;HH:mm:ss — descrição`.
  - Editar (volta ao wizard com `editId`), Baixar PDF, Enviar WhatsApp (mensagem segundo `formatoMensagem`), gerar Recibo.
- `/orcamentos/$id/recibo` — gera recibo de pagamento, PDF.

### 3. Clientes (`/clientes`)
CRUD simples: nome, apelido, telefone, e-mail, documento, endereço. Busca local.

### 4. Fornecedores (`/fornecedores`)
CRUD com categoria.

### 5. Agenda (`/agenda`)
Eventos vinculáveis a orçamentos. Lista cronológica.

### 6. Configurações (`/configuracoes`)
- Dados da empresa, logo, assinatura (dataURL).
- Listas customizadas (serviços/materiais padrão para flash e detalhado, formas de pagamento, ambientes).
- Mensagem padrão WhatsApp.
- Tema (`moderno|brutalista|minimalista`), tamanho de fonte, alto contraste.

### 7. Backup (`/backup`)
Export ZIP (JSON + fotos) e import. Sem nuvem.

### 8. Mais (`/mais`) e Termos (`/termos`)
Atalhos secundários.

---

## Câmera e editor de foto

- **`src/components/camera-modal.tsx`**: usa `MediaTrackCapabilities.torch` para flash de hardware real (pulso de 80ms antes do `getImageData`). Fallback: flash de tela.
- **`src/components/photo-editor.tsx`**: anotações (seta, retângulo, círculo, texto). Todas as formas são arrastáveis (correção: antes só `text` arrastava). Seta move os dois pontos juntos.

---

## Navegação e Sidebar

- `src/components/app-shell.tsx`:
  - `SidebarProvider` com estado `collapsed` persistido em `localStorage` (`pp.sidebar.collapsed`). Inicializa lendo a chave antes do primeiro render → respeita escolha entre páginas.
  - `MenuButton` (hambúrguer) flutuante sempre visível.
  - `PageHeader` reutilizável (eyebrow, título, actions).
- `src/routes/__root.tsx`: aplica `data-theme`, `data-fonte`, `data-contraste` no `<html>` a partir do `db.config.get(1)` via `useLiveQuery`.

---

## Performance (mobile first)

1. **Sem `backdrop-blur` pesado**: substituído por `bg-surface/80` opaco e `bg-midnight` sólido em overlays.
2. **Sem `transition-colors` no root**.
3. **Fontes locais via `@font-face`** (sem Google Fonts bloqueante).
4. **Live queries consolidadas** no dashboard (`Promise.all` em um único `useLiveQuery`).
5. **Lazy imports**: `jspdf` e `jszip` só são importados dentro das funções que os usam.
6. **`defaultPreload: "intent"`** no router para baixar chunk antes do clique.
7. **Bundle hygiene**: remoção de deps não usadas (`embla, vaul, react-day-picker, cmdk, recharts, input-otp, react-resizable-panels`).

---

## System design (resumo)

```text
┌──────────────────────────────────────────────────────────────┐
│  Browser (PWA, offline-first)                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  React 19 + TanStack Router (file-based, SPA client)     │ │
│ │ ┌────────────┐  ┌────────────┐  ┌─────────────────────┐  │ │
│ │ │ Dashboard  │  │ Orçamentos │  │ Clientes/Forn/Ag.   │  │ │
│ │ └────────────┘  └────────────┘  └─────────────────────┘  │ │
│ │           │            │                  │              │ │
│ │           ▼            ▼                  ▼              │ │
│ │     ┌────────────────────────────────────────────┐       │ │
│ │     │ Camada de domínio: lib/orcamentos.ts       │       │ │
│ │     │  persistOrcamento (diff → historico)       │       │ │
│ │     │  updateStatusWithLog                       │       │ │
│ │     └────────────────────────────────────────────┘       │ │
│ │                            │                             │ │
│ │                            ▼                             │ │
│ │     ┌────────────────────────────────────────────┐       │ │
│ │     │  Dexie (IndexedDB)  —  pintor_plus v2      │       │ │
│ │     │  clientes · fornecedores · orcamentos      │       │ │
│ │     │  fotos (Blob) · eventos · recibos · config │       │ │
│ │     └────────────────────────────────────────────┘       │ │
│ │                            │                             │ │
│ │                            ▼                             │ │
│ │     ┌────────────────────────────────────────────┐       │ │
│ │     │ Export/Import ZIP (jszip lazy) ─ Backup    │       │ │
│ │     │ PDF (jspdf lazy) ─ WhatsApp (wa.me deeplnk)│       │ │
│ │     │ Câmera (getUserMedia + torch hw)           │       │ │
│ │     └────────────────────────────────────────────┘       │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Princípios invariantes**:
- Nenhum dado sai do dispositivo sem ação explícita (PDF/WhatsApp/Backup).
- Toda mutação de orçamento passa por `persistOrcamento` → log automático.
- Toda lista observada usa `useLiveQuery` para reatividade Dexie → UI.
- Roteamento file-based; novos features = novo arquivo em `src/routes/`.

---

## Roadmap próximo (não bloqueante)

- Migração opcional para SQLite (sql.js + OPFS) quando volume justificar.
- Sincronização P2P opcional via WebRTC (sem servidor central).
- Assinatura digital do cliente no recibo (canvas).
