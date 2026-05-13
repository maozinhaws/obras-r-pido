# Pintor Plus — Plano

PWA mobile-first, offline-first, instalável no Android e iOS. Dados locais no dispositivo (IndexedDB) com backup manual em arquivo e backup opcional no Google Drive do próprio pintor. Sem login, sem servidor de dados. Wrapper Android (Capacitor/TWA) fica para uma fase posterior, fora da Lovable.

## Fase 0 — Direções visuais
Antes de codar, gero 2-3 direções visuais variando densidade, hierarquia e ênfase, mantendo: roxo principal, fonte Sora, cards, cantos arredondados moderados, dark mode, "ferramenta de trabalho" (não landing). Você escolhe uma e parto pra build.

## Fase 1 — Fundação
- PWA instalável (manifest, ícones, tela inicial). Service worker só em produção, desabilitado no preview da Lovable.
- Stack: TanStack Start (rotas em `src/routes/`), Tailwind, shadcn, design tokens em `src/styles.css`.
- Camada de dados local com Dexie (IndexedDB): schema versionado para `empresa`, `clientes`, `fornecedores`, `orcamentos`, `ambientes`, `itens`, `fotos` (Blob), `eventos`, `recibos`, `configuracoes`.
- Hook `useDb` + repositórios por entidade. Estado com TanStack Query usando o Dexie como fonte.
- Layout shell: bottom nav mobile (Início, Orçamentos, Clientes, Agenda, Mais) + drawer com itens secundários (Fornecedores, Backup, Configurações, Termos). Botões grandes, alvos ≥ 44px, feedback tátil.

## Fase 2 — Núcleo: Orçamento
- Wizard 4 passos com salvamento automático em rascunho a cada mudança e confirmação ao sair com alterações.
  1. Cliente: form + autocomplete em clientes salvos + botão "novo".
  2. Ambientes/Itens: lista de ambientes; cada ambiente abre tela de itens.
     - Item: chips para nome (sala, quarto, fachada, teto, parede, janela…), medidas (altura×comprimento, m²), chips de serviços (lixar, massa, primer, 1ª demão, 2ª demão, textura…), material/observação, fotos (câmera + galeria, com preview e remoção). Botão câmera em destaque.
  3. Pagamento/Detalhes: forma, validade, início, tipo de serviço, observações.
  4. Revisão/Envio: total calculado, prévia da mensagem WhatsApp, ações: salvar, gerar PDF, enviar WhatsApp, gerar recibo.
- Cálculo de total derivado de itens (m² × preço + serviços) com possibilidade de override manual.
- Status do orçamento: rascunho, enviado, aprovado, em andamento, finalizado, cancelado (editável inline na lista).

## Fase 3 — Demais módulos
- **Lista Orçamentos**: cards com cliente, valor e status em destaque, data, ações rápidas (ver, editar, enviar, PDF, recibo, excluir). Busca + filtro por status.
- **Clientes**: lista, busca, CRUD, "usar no orçamento", import via Contact Picker API quando disponível (Android Chrome).
- **Fornecedores**: lista, busca, CRUD, categoria/serviço, ação "pedir cotação" via WhatsApp.
- **Agenda**: visão "Hoje" + próximos + mês. Evento com vínculo opcional a orçamento. Export `.ics` para o calendário do celular.
- **Recibo**: gerado a partir de orçamento finalizado (valor recebido, data, forma, observação). HTML imprimível + PDF. Aviso "Não é nota fiscal".
- **PDF & WhatsApp**: PDF gerado client-side (jsPDF + html2canvas ou pdf-lib). Logo, dados da empresa e assinatura do Configurações. WhatsApp via `https://wa.me/<numero>?text=<msg>` com mensagem padrão configurável.
- **Configurações**: dados da empresa (nome, telefone, email, CNPJ/CPF, endereço, logo, assinatura), mensagem padrão WhatsApp, serviços padrão (chips editáveis), formas de pagamento, status customizados, acessibilidade (tamanho da fonte, alto contraste).

## Fase 4 — Backup
- Export/Import backup local: JSON (+ fotos em base64 ou ZIP via JSZip). Botão "Exportar backup" baixa arquivo; "Importar" restaura.
- Backup Google Drive: OAuth Google por usuário (pintor), escopo `drive.appdata` (pasta privada do app, não polui o Drive). Salva snapshot ao final do dia ou sob demanda; mostra status (último backup, tamanho, conta conectada). Aviso claro sobre proteção dos dados.

## Fase 5 — Home
Construída por último, depois que tudo já existe pra ela puxar:
- nome/logo da empresa, atalhos grandes (Novo orçamento, Novo cliente, Câmera→item rápido), últimos orçamentos, próximos eventos, status do backup (último/Drive).

## Detalhes técnicos
- **Rotas** (TanStack file-based, cada uma com `head()` próprio): `/`, `/orcamentos`, `/orcamentos/novo`, `/orcamentos/$id`, `/orcamentos/$id/recibo`, `/clientes`, `/fornecedores`, `/agenda`, `/backup`, `/configuracoes`, `/termos`.
- **Persistência**: Dexie 4.x. Migrations versionadas. Fotos como Blob no IndexedDB (não base64 no JSON em memória).
- **Offline**: app shell cacheado pelo SW; toda lógica roda local; nenhuma rota depende de rede para tarefa básica.
- **Validação**: Zod nos forms (react-hook-form + zodResolver).
- **Câmera/galeria**: `<input type="file" accept="image/*" capture="environment">` com fallback. Compressão client-side antes de salvar (canvas → JPEG ~1600px).
- **Google Drive**: Google Identity Services (GIS) para token OAuth, fetch direto na API do Drive (`appDataFolder`). Client ID configurado pelo usuário em Configurações ou via env var pública.
- **PWA no preview**: registro do SW guardado por `isInIframe || lovable host` para não quebrar o preview da Lovable. Aviso de que offline/install só funciona no build publicado.
- **Wrapper Android**: documentação curta no Termos/README explicando como o pintor pode empacotar com Capacitor/TWA depois (fora do escopo Lovable).

## Fora deste plano
- Sync multi-dispositivo (não pediu; ficou Local + Drive).
- Login/conta de usuário.
- Nota fiscal real / integração fiscal.
- Pagamentos online.

## Próximo passo
Confirma o plano e eu já gero as 2-3 direções visuais para você escolher antes de começar a Fase 1.
