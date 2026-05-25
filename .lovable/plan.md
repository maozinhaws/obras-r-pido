Salvar a classificação 360° de botões (primário/secundário/terciário/destrutivo) num arquivo `fluxo.md` na raiz do projeto, organizada por página e por fluxo do app Pintor, exatamente como apresentei na resposta anterior.

## Conteúdo do arquivo

- Critério de classificação (Primário gradiente / Secundário suave / Terciário ghost / Destrutivo)
- Lista página por página: Login, Home, Orçamentos, Clientes, Fornecedores, Agenda, Configurações, Termos, Mais
- Fluxo flash (s1 → s2 → s3 → s4) com ramificações
- Modais: services-modal, send-opts-modal, item-modal-form, modal-recibo, del-confirm-modal, cfg-save-modal
- Gap de alto contraste (onde `body.contraste-alto` ainda não chega)
- Decisões pendentes (WhatsApp vs PDF como primário em s4)

## Localização

`fluxo.md` na raiz do repositório (mesmo nível de `package.json` e `.lovable/plan.md`).

## O que NÃO vou fazer

- Não vou aplicar nenhuma das ondas de mudança de CSS/HTML ainda — só documentar.
- Não vou tocar em `public/pintor/`, `src/`, ou qualquer outro arquivo.