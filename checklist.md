# Checklist de Validação Rápida — Design + Acessibilidade

Use no celular real, em modo claro **e** escuro, com `Alto contraste` ligado e desligado, e nas 4 escalas de fonte (P / M / G / XG). Marque ✅ ou anote o que falha.

---

## 🐞 Bug do header (regressão recém-corrigida)

- [ ] Em **Orçamentos**, **Clientes**, **Fornecedores**, **Agenda**, **Configurações**, **Termos**, **Mais**, **Backup** → o botão **hambúrguer** (esq) e o botão **Home** (direita do hambúrguer) **não se sobrepõem**.
- [ ] Os dois ficam lado a lado, com gap visível.
- [ ] O toggle de tema fica isolado no canto **direito**.

---

## 🎨 Design — botões por página

### Home (`pg-home`)
- [ ] **Novo Orçamento** = degradê laranja→roxo (primário).
- [ ] **Ver todos / Ver agenda / Ver revista** = lilás bem suave, fundo translúcido (~7% roxo). Não chama mais atenção que o primário.

### Orçamentos
- [ ] **+ Novo Orçamento** = degradê primário.
- [ ] Filtros de status, **Ver recibo**, **Editar** = glass suave.
- [ ] **Excluir** = vermelho.

### Clientes / Fornecedores
- [ ] **+ Novo Contato / + Novo Fornecedor** = degradê primário.
- [ ] **Importar da agenda** = azul claro suave (não compete).
- [ ] **Excluir** = vermelho.

### Agenda
- [ ] **+ Novo Evento** = degradê primário.
- [ ] Setas ‹ › de mês = ghost.

### Configurações
- [ ] **Salvar** = degradê primário.
- [ ] **Cancelar / Descartar** = glass suave, **bem mais discreto** que antes.
- [ ] **Apagar todos os dados** = vermelho.

### Termos
- [ ] **Aceitar e continuar** = degradê primário.
- [ ] **Voltar** = glass suave.

### Backup
- [ ] **Exportar backup** = degradê primário.
- [ ] **Importar backup** = glass suave.

---

## 🧙 Fluxo Flash (s1 → s4)

- [ ] s1, s2, s3: **Avançar →** com degradê primário. **‹ Voltar** suave.
- [ ] s4: **Salvar** com degradê primário. **Compartilhar** roxo sólido. **WhatsApp** verde translúcido. **PDF** roxo translúcido.
- [ ] Nenhum step tem 2 botões "primários" disputando atenção.

---

## 🎛️ Estados de botão (testar nos 3 principais: primário, WhatsApp, PDF)

Em **modo claro normal**, **escuro normal**, **claro + alto contraste**, **escuro + alto contraste**:

- [ ] **Repouso:** cor de marca correta (laranja→roxo / verde / roxo).
- [ ] **Hover** (passar dedo lentamente em touch): tom ligeiramente mais vivo, sem mudar de cor.
- [ ] **Pressionado** (`:active`): leve scale(.98) e tom mais escuro, **continua na mesma família de cor**.
- [ ] **Disabled:** opacidade reduzida, cursor `not-allowed`, **mantém o tom base** (não fica cinza puro).
- [ ] **Loading** (se aplicável: `.is-loading`): spinner branco à direita, mantém cor de marca.

---

## ♿ Alto contraste — varredura tela a tela

Ligue em `Configurações → Alto contraste`. Confira que **todos** os componentes ganham reforço (borda 2px + fundo sólido + texto preto/branco):

- [ ] **Login** — botões, inputs, card central.
- [ ] **Home** — cards de métrica, cards de últimos orçamentos, mini-eventos, news, **avatar/identidade**.
- [ ] **Orçamentos** — cards de orçamento, chips de status, search bar, FAB.
- [ ] **Clientes / Fornecedores** — linhas da lista, search, FAB.
- [ ] **Agenda** — células do calendário, eventos do dia, FAB.
- [ ] **Configurações** — todas as seções, switches, inputs, botões.
- [ ] **Backup** — cards `.gd-card`, botões de import/export.
- [ ] **Termos** — texto legível, botões reforçados.
- [ ] **Mais** — os 4 cards de navegação com borda 2px.
- [ ] **Flash s1–s4** — wizard com bordas reforçadas, inputs brancos opacos, item-cards com borda preta.

### Modais (todos)
- [ ] `services-modal`, `send-opts-modal`, `item-modal-form`, `modal-recibo`, `del-confirm-modal`, `cfg-save-modal`, `pp-contatos-modal`, `obsPickModal`, `draft-confirm-modal`, **photo-annotator**, **camera-modal** → fundo branco/preto sólido, borda 2px, headers legíveis, botão × visível.

### Header / chrome global
- [ ] Hambúrguer, Home e toggle de tema com bordas reforçadas.
- [ ] Sidebar drawer: links com contraste forte, divisor visível.

---

## 🔤 Escala de fontes (P / M / G / XG)

Para cada uma:
- [ ] Títulos não estouram horizontalmente.
- [ ] Botões não quebram texto de forma feia.
- [ ] Inputs continuam com 16px mínimo (não dá zoom no iOS).
- [ ] Cards crescem proporcionalmente sem sobreposição.

---

## ✅ Status final

Quando todos os itens estiverem ✅, design + acessibilidade estão validados. Se algum item falhar, anote a tela + componente e me envie — corrijo cirurgicamente sem mexer no resto.
