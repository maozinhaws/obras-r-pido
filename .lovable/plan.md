## Objetivo

Permitir que o usuário faça backup usando **conta Google** (fluxo atual, Drive) **ou** se cadastrando com **e-mail + senha + telefone**, com **recuperação de senha por e-mail**. Contas com o mesmo e-mail compartilham o mesmo backup (unificação).

## Arquitetura

1. **Habilitar Lovable Cloud** (backend gerenciado — Supabase por baixo dos panos) para: auth e-mail/senha, reset de senha por e-mail, e armazenamento do backup JSON.
2. **Chave de unificação = e-mail (lowercase).** Tanto login Google quanto login e-mail/senha resolvem para a mesma linha `backups.email`. Assim, se o usuário se cadastrar com `joao@x.com` por e-mail e depois entrar com Google no mesmo `joao@x.com`, ele vê o mesmo backup.
3. **Fallback Drive continua funcionando:** quem faz login Google segue sincronizando também no Drive (redundância). O Cloud passa a ser a fonte canônica; Drive vira secundário.

## Backend (Lovable Cloud)

Tabelas:
- `profiles` — `id (uuid, FK auth.users)`, `email`, `telefone`, `nome`, `created_at`. Trigger `on_auth_user_created` cria a linha.
- `backups` — `email (text, PK, lowercase)`, `data (jsonb)`, `updated_at`, `updated_by (uuid)`, `device_id (text)`. Uma linha por e-mail.

RLS em `backups`:
- SELECT/UPDATE/INSERT: `email = lower((auth.jwt() ->> 'email'))`. Não usa `user_id` para permitir que Google e e-mail/senha com mesmo e-mail acessem a mesma linha.

Server functions (`createServerFn` com `requireSupabaseAuth`):
- `getBackup()` → retorna `{ data, updated_at }` da linha do e-mail do usuário.
- `saveBackup({ data, deviceId })` → upsert com merge server-side (mesma lógica de `_mergeSnapshot` do `drive-sync.js`, portada para server) + `updated_at = now()`.

Config Supabase Auth:
- Provider **Email** habilitado, com confirmação de e-mail desligada (para simplicidade) OU ligada — a definir na implementação. Recuperação de senha via `resetPasswordForEmail` (template padrão do Cloud).
- Provider **Google** habilitado (`configure_social_auth`) para que o login Google também gere sessão Supabase e alimente o mesmo `email` — mantém a unificação sem depender só do Drive.

## Frontend (app legado `public/pintor/`)

Novo módulo `public/pintor/cloud-sync.js`:
- Cliente Supabase inicializado com `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (expostos por endpoint público `/api/public/supabase-config` no mesmo modelo de `google-config.ts`).
- API espelha `drive-sync.js`: `cloudSignUp`, `cloudSignIn`, `cloudSignOut`, `cloudResetPassword`, `cloudSync()` (baixa remoto, mescla com local, faz upsert), `getCloudStatus()`.
- Faz merge com a mesma função de reconciliação já usada no Drive (extrair para `sync-merge.js` compartilhado).

Fluxo de sessão unificado em `index.html`:
- Tela de login mostra: **botão "Entrar com Google"** (existente) **+ formulário "Entrar com e-mail"** com abas **Entrar / Criar conta / Esqueci minha senha**.
- Cadastro pede: nome, e-mail, telefone, senha (min 8, com força visível). Telefone salvo em `profiles.telefone` (só contato, sem SMS).
- Após qualquer login, dispara `cloudSync()` primeiro e, se houver sessão Google válida, também `backupAutoSync()` (Drive). Mesclagem final é feita e re-enviada para ambos.
- Configurações → Backup: mostra e-mail conectado, botão "Sincronizar agora", link "Sair", link "Alterar senha" (envia e-mail de reset), e uma linha "Google Drive: conectado/desconectado" com toggle.

Reset de senha:
- Rota estática `public/pintor/reset-password.html` (recebe hash `#access_token=...&type=recovery` do link do e-mail) → form pedindo nova senha → chama `supabase.auth.updateUser({ password })` → redireciona para `/pintor/`.
- URL de redirect passada no `resetPasswordForEmail`: `${origin}/pintor/reset-password.html`.

## Validação

- `zod` (server) + validação inline no legado: e-mail válido, telefone só dígitos ≥ 10, senha ≥ 8 chars.
- Testes em `src/lib/pintor-flow.test.ts`: novo bloco verificando presença dos IDs de formulário de auth, presença do endpoint `/api/public/supabase-config`, e que `cloud-sync.js` exporta as funções esperadas em `window`.

## Passos de implementação

1. Habilitar Lovable Cloud (`supabase--enable`).
2. Migrations: criar `profiles`, `backups`, trigger de criação de profile, RLS + GRANTs.
3. Habilitar Auth email + Google no Supabase (via `configure_social_auth` para Google — reaproveita o Client ID atual).
4. Criar server functions `getBackup` / `saveBackup` + rota `/api/public/supabase-config` expondo URL + anon key.
5. Criar `public/pintor/cloud-sync.js` + `sync-merge.js` (extraído de `drive-sync.js`).
6. Adicionar UI de auth (Entrar / Criar conta / Esqueci senha) no `index.html`, integrar em Configurações → Backup.
7. Criar `public/pintor/reset-password.html`.
8. Testes + checklist manual (login novo, login existente, reset, cross-device sync entre Google e e-mail/senha com mesmo endereço).

## Detalhes técnicos

- Merge server-side reutiliza `_mergeArrayById` / `_mergeConfig` — portar para TS em `src/lib/backup-merge.ts` e importar tanto no server fn quanto (via bundle separado) no legado, ou duplicar em JS puro dentro de `sync-merge.js` para evitar bundler no legado.
- Guardar `device_id` no `localStorage` (`pp-device-id`) já existe — reaproveitar.
- `email` em `backups` sempre `lower(trim(email))` — normalizar em client e server.
- Erros exibidos no toast já existente, reaproveitando `_classifyDriveError` como referência de UX.
