# Remover o Google Drive e deixar só o backup na Nuvem

O erro 403 vem do projeto Google Cloud (Drive API desativada / domínio não autorizado no Client ID) e não pode ser corrigido pelo app. Como o backup na Nuvem já sincroniza entre dispositivos pela conta do usuário, o sync por Drive sai de cena.

## O que muda para você

- A tela de entrada e a seção de Backup passam a ter uma única forma de salvar: **sua conta na Nuvem** (e-mail + senha + telefone, com recuperação de senha) e **Entrar com Google** — o Google passa a ser só login de conta, sem pedir permissão de Drive.
- Somem os botões e avisos ligados ao Google Drive (conectar Drive, escolher backup do Drive, "falha ao sincronizar / confira as permissões do Google Drive").
- O ícone de status no topo e o botão "Sincronizar agora" passam a refletir apenas a Nuvem: pendente, sincronizando, ok ou erro.
- Nada dos seus dados atuais é apagado: o que está no aparelho continua e sobe para a Nuvem no primeiro sync.

## Escopo técnico

1. **Apagar** `public/pintor/drive-sync.js` e remover a tag `<script src="/pintor/drive-sync.js?v=7">` de `public/pintor/index.html`.
2. **Substituir as funções que vinham do drive-sync** e são usadas em `index.html` por equivalentes da Nuvem:
   - `ppGetUser()` → sessão de `cloudGetSession()` (mais nome/foto guardados em `localStorage`).
   - `ppSignIn` / `ppSignOut` / `ppHandleCredential` → `cloudSignIn` / `cloudSignOut` / login Google via Supabase.
   - `executeSync` / `scheduleSync` / `backupAutoSync` → `cloudSync` / `cloudScheduleSync` (removendo o encadeamento em `cloud-sync.js` que hoje espera o `scheduleSync` do Drive).
   - `getSyncStatus` / `getSyncLastError` → `getCloudStatus` / `getCloudLastError`.
3. **Remover a UI do Drive** em `index.html`: `gdriveConnect`, `gdriveBackupNow`, `gdriveDisconnect`, `renderGdriveConfig`, modal `gdrive-restore-modal` e as linhas de diagnóstico `pp-gdrive-*`; a seção de Backup passa a renderizar só a conta da Nuvem (`renderCloudConfig`).
4. **Login com Google na Nuvem**: botão chama o fluxo de OAuth Google do backend (redirect para a origem pública do app) e, na mesma entrega, habilitar o provedor Google na autenticação do backend.
5. **Limpeza**: remover a rota `src/routes/api/public/google-config.ts` e as chaves `pp-gdrive-*` do `localStorage` no primeiro boot após a atualização.
6. **Testes**: atualizar `src/lib/pintor-flow.test.ts` para não referenciar o drive-sync e cobrir status/erros da Nuvem; rodar a suíte.
