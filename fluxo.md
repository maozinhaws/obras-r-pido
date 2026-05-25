# Fluxo 360° — Classificação de Botões (Pintor Plus)

Documento de referência para padronização visual. Todo botão do app deve se encaixar em uma das 4 categorias abaixo, sem exceção.

## Critério de classificação

| Categoria | Aparência | Quando usar |
|---|---|---|
| **Primário** | Gradiente quadricolor `#ff8a3d → #ff6b35 → #ec4899 → #7b5cff`, texto branco | Ação que **avança o objetivo principal** da tela. **Apenas 1 por tela/modal.** |
| **Secundário** | Glass translúcido (claro: branco 72% / escuro: ink 72%), texto cor do tema, borda sutil | Voltar, cancelar, ações utilitárias, navegação alternativa |
| **Terciário / Ghost** | Sem fundo, só ícone ou texto | Menu, sync, toggle tema, fechar (×), navegação por ícone |
| **Destrutivo** | Vermelho sólido ou borda vermelha, texto branco/vermelho | Apagar, excluir, ações irreversíveis |

> Regra de ouro: **um único primário por contexto visível**. Se houver dois "primários" lado a lado, um deles está errado.

---

## Página por página

### Login
- **Primário:** `Entrar com Google`
- **Secundário:** `Usar offline`

### Home (`/`)
- **Primário:** `Novo Orçamento` (já usa `.glass-brand`, mantém)
- **Secundário:** `Ver todos`, `Ver agenda`, `Ver revista`
- **Ghost:** menu hambúrguer, sync, toggle de tema

### Orçamentos (`/orcamentos`)
- **Primário:** `+ Novo Orçamento`
- **Secundário:** filtros de status, `Ver recibo`, `Editar`
- **Ghost:** menu de card (⋯)
- **Destrutivo:** `Excluir orçamento`

### Clientes (`/clientes`)
- **Primário:** `+ Novo Contato`
- **Secundário:** `Importar da agenda do celular`, `Editar`
- **Destrutivo:** `Excluir contato`

### Fornecedores (`/fornecedores`)
- **Primário:** `+ Novo Fornecedor`
- **Secundário:** `Editar`
- **Destrutivo:** `Excluir fornecedor`

### Agenda (`/agenda`)
- **Primário:** `+ Novo Evento`
- **Secundário:** navegação de mês (‹ ›), `Hoje`
- **Ghost:** seleção de dia no calendário

### Configurações (`/configuracoes`)
- **Primário:** `Salvar`
- **Secundário:** `Cancelar`, `Trocar logo`, `Exportar backup`, toggles de seção
- **Destrutivo:** `Apagar todos os dados`

### Termos (`/termos`)
- **Primário:** `Aceitar e continuar`
- **Secundário:** `Voltar`

### Mais (`/mais`)
- **Secundário:** todos os 4 cards de navegação (Fornecedores, Backup, Configurações, Termos) — são navegação, não ação

### Backup (`/backup`)
- **Primário:** `Exportar backup` (ação principal da tela)
- **Secundário:** `Importar backup`
- **Destrutivo:** `Apagar todos os dados`

---

## Fluxo Flash (Novo Orçamento — 4 etapas)

Wizard sequencial. Cada etapa tem **1 primário + 1 secundário**.

### s1 — Cliente
- **Primário:** `Avançar →`
- **Secundário:** `‹ Voltar` (volta para Home)
- **Terciário:** `Selecionar da lista` (abre modal de clientes)

### s2 — Itens / Serviços
- **Primário:** `Avançar →`
- **Secundário:** `‹ Voltar`
- **Terciário:** `+ Adicionar item` (abre `item-modal-form`), `+ Serviços padrão` (abre `services-modal`)

### s3 — Pagamento / Condições
- **Primário:** `Avançar →`
- **Secundário:** `‹ Voltar`

### s4 — Resumo / Envio  ⚠️ DECISÃO PENDENTE
- **Primário:** *(a definir — ver decisões pendentes abaixo)*
- **Secundário:** `‹ Voltar`, `Salvar rascunho`
- **Terciário:** `Compartilhar` (abre `send-opts-modal`)

### Ramificações de s4
- → **modal-recibo:** visualizar PDF
- → **send-opts-modal:** escolher canal de envio (WhatsApp / PDF / Link)
- → após envio: volta para `/orcamentos` com flash de sucesso

---

## Modais (todos com mesmo glassmorphism: bg 72%, blur 40px, borda 1px)

| Modal | Primário | Secundário | Destrutivo |
|---|---|---|---|
| `services-modal` | `Adicionar selecionados` | `Cancelar` | — |
| `send-opts-modal` | `WhatsApp` *(provável)* | `PDF`, `Link`, `Cancelar` | — |
| `item-modal-form` | `Salvar item` | `Cancelar` | `Remover` (se editando) |
| `modal-recibo` | `Compartilhar` / `Imprimir` | `Fechar` | — |
| `del-confirm-modal` | — | `Cancelar` | `Apagar` |
| `cfg-save-modal` | `Salvar` | `Descartar` | — |

> Header de modal: **sem fundo próprio** (transparente, herda do `.modal-box`). Botão × no header é Ghost.

---

## Gap de alto contraste

`body.contraste-alto` (ou `[data-contraste="alto"]`) hoje só atinge:
- ✅ Inputs e labels do legado `/pintor/`
- ✅ Cards de configurações

**Falta cobrir:**
- ❌ Botões (primário, secundário, destrutivo) — bordas e contraste de texto
- ❌ Modais (todos)
- ❌ Header / topnav
- ❌ Chips e filtros
- ❌ Cards da Home (`.glass-brand` e demais)
- ❌ Calendário da Agenda
- ❌ FABs (botão flutuante de novo orçamento)
- ❌ Sidebar e drawer mobile
- ❌ `item-card` (linhas de itens no orçamento)
- ❌ Página de Termos
- ❌ Login
- ❌ Wizard flash (s1–s4)

**Próxima onda:** estender `[data-contraste="alto"]` em `src/styles.css` e `public/pintor/lovable-theme.css` para forçar:
- Texto sempre `#0a0a0a` no claro / `#fafafa` no escuro
- Bordas 2px em vez de 1px
- Reduzir opacidades de glass de 72% → 92%
- Remover transparências de chips e badges

---

## Decisões pendentes

1. **s4 e `send-opts-modal`:** qual ação é o primário gradiente — `WhatsApp` ou `PDF`?
   - Hipótese atual: **WhatsApp** (canal mais usado por pintor em campo).
2. **Confirmar primário/secundário acima** — alguma troca necessária?
3. **Aplicar em ondas?**
   - Onda 1: reclassificar todos os botões globalmente (CSS único por papel).
   - Onda 2: estender `[data-contraste="alto"]` para todo o app.
