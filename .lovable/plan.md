## O que está quebrado

1. **Botão "Avançar" voltou a ser roxo sólido.** A regra de wizard em `public/pintor/lovable-theme.css:904-916` está sobrescrevendo o gradiente quadricolor com `linear-gradient(135deg, var(--bl) 0%, var(--bl) 45%, var(--bl2) 100%)` (roxo→roxo). Isso conflita com a regra global de `.wbtn-next` (linha 366-373) que já é quadricolor laranja→rosa→roxo.

2. **Modal "Novo item" com transparências inconsistentes.** O `.modal-box` está em `rgba(255,255,255,0.88)` (linha 171) — quase opaco — enquanto o resto do app (sidebar, cards, topnav) usa `0.72`. Além disso o header do modal e o corpo aparecem com tons diferentes porque há subseções (`.modal-hdr`, áreas internas) sem fundo transparente forçado, herdando o branco do bundle.

## Princípio (regra única, sem exceções)

- **Botão primário/CTA** = SEMPRE o mesmo gradiente quadricolor:
  `linear-gradient(135deg, #ff8a3d 0%, #ff6b35 35%, #ec4899 65%, #7b5cff 100%)`
  Vale para: `.act-save`, `.wbtn-next`, `#btnSalvarItem`, "Avançar", "Salvar", "Salvar Item", "Confirmar", "Salvar Config", botão de login.

- **Botão secundário** = SEMPRE glass branco translúcido com texto escuro (claro) ou glass escuro com texto branco (dark). Vale para: `.wbtn-back`, `.act-soft`, "Cancelar", "Voltar".

- **Modal/Card/Sidebar** = SEMPRE a mesma fórmula de glass:
  - claro: `rgba(255,255,255,0.72)` + `blur(40px) saturate(180%)` + `1px solid rgba(255,255,255,0.5)`
  - escuro: `rgba(20,14,30,0.72)` + mesmas blur/borda
  Sem variação por componente. Header do modal SEM fundo próprio (transparente, herda do `.modal-box`).

## Mudanças em `public/pintor/lovable-theme.css`

1. **Remover o override roxo do wizard** (linhas 904-916): apagar a propriedade `background` daquela regra, mantendo só height/padding/font/border-radius/shadow. Assim o `.wbtn-next` global (gradiente quadricolor da linha 366-373) prevalece em todas as páginas.

2. **Unificar `.modal-box`** (linha 169-181): trocar `0.88` por `0.72`, manter blur e borda iguais aos do `.sidebar`. No dark, trocar `0.78` por `0.72`.

3. **Forçar header do modal transparente**: adicionar regra `.modal-box .modal-hdr, .modal-box > header, #item-modal .modal-hdr { background: transparent !important; backdrop-filter: none !important; border-bottom: 0 !important; }` para eliminar a faixa branca opaca em cima.

4. **Forçar áreas internas do modal sem fundo próprio**: `.modal-box .modal-body, .modal-box .modal-section { background: transparent !important; }` para nenhum bloco interno parecer mais opaco que outro.

5. **Bump de cache** em `public/pintor/index.html` (linha 1817): `v=26` → `v=27` para o browser pegar o CSS novo.

## O que NÃO vou mexer

- Inputs (já estão corretos com fundo branco sólido + borda slate, conforme memória do projeto).
- Tipografia dos placeholders (já está fina + cinza claro).
- Lógica JS, rotas, estrutura de HTML, modal de edição de imagem, câmera, sistema de acessibilidade.
- Componentes React em `src/` (a rota atual do usuário é o app legado `/pintor/index.html`).

## Sobre o skill huashu-design

É um repositório de referência de design de pôsteres chineses; não está instalado como skill ativo neste projeto e não muda o que precisa ser feito aqui — o problema é puramente consistência de design tokens. Vou aplicar princípios de design sênior: uma única regra por papel visual, sem exceções por tela.

## Validação

Após a mudança vou abrir a preview, navegar até `#pg-s2` (passo 2/4) e o modal "Novo item" para confirmar visualmente que (a) "Avançar" está em gradiente igual a "Salvar Item", e (b) o modal tem opacidade uniforme do topo até embaixo.
