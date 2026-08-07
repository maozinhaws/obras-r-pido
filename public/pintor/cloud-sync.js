/* Pintor Plus — Cloud sync (Lovable Cloud / Supabase)
 * Auth por e-mail+senha+telefone e backup unificado por conta (chave = e-mail).
 * Coexiste com o backup no Google Drive: os dois recebem o mesmo snapshot.
 *
 * Expõe no window:
 *   cloudReady            -> Promise que resolve quando o SDK carregou
 *   cloudGetSession()     -> { email, userId } | null
 *   cloudSignUp({ email, senha, nome, telefone }) -> user | erro
 *   cloudSignIn({ email, senha })                 -> user | erro
 *   cloudSignOut()
 *   cloudRecoverPassword(email)                   -> envia e-mail de reset
 *   cloudSync()                                   -> baixa/mescla/envia backup
 *   getCloudStatus()      -> 'idle' | 'pending' | 'syncing' | 'ok' | 'error' | 'offline'
 *   getCloudLastError()   -> string
 */
(function () {
  'use strict';

  const KEYS = ['pp-config', 'pp-orcs', 'pp-clientes', 'pp-fornecedores', 'pp-eventos'];
  let _sb = null;
  let _status = 'offline';
  let _lastError = '';
  let _syncing = false;

  function _setStatus(s) {
    _status = s;
    try { window.renderCloudConfig?.(); } catch (e) {}
    try { window.renderSyncStatus?.(); } catch (e) {}
  }
  function getCloudStatus() { return _status; }
  function getCloudLastError() { return _lastError; }
  function _setErr(m) {
    _lastError = m || '';
    if (m) localStorage.setItem('pp-cloud-lastError', m);
    else localStorage.removeItem('pp-cloud-lastError');
  }

  window.cloudReady = (async function boot() {
    try {
      const r = await fetch('/api/public/supabase-config', { cache: 'no-store' });
      if (!r.ok) throw new Error('config http ' + r.status);
      const cfg = await r.json();
      if (!cfg.url || !cfg.key) throw new Error('config vazia');
      if (!window.supabase || !window.supabase.createClient) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
          s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('SDK Supabase não carregou'));
          document.head.appendChild(s);
        });
      }
      _sb = window.supabase.createClient(cfg.url, cfg.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: localStorage,
          storageKey: 'pp-cloud-auth',
        },
      });
      const { data } = await _sb.auth.getSession();
      if (data?.session) {
        _setStatus('pending');
        // Sincroniza automaticamente após boot
        setTimeout(() => cloudSync().catch(() => {}), 1200);
      }
      _sb.auth.onAuthStateChange((evt) => {
        if (evt === 'SIGNED_OUT') _setStatus('offline');
        try { window.renderCloudConfig?.(); } catch (e) {}
      });
      return true;
    } catch (e) {
      console.warn('[cloud-sync] boot falhou', e);
      _setErr(e?.message || 'Falha ao carregar backend.');
      return false;
    }
  })();

  function _normalize(email) { return String(email || '').trim().toLowerCase(); }

  function cloudGetSession() {
    try {
      const raw = localStorage.getItem('pp-cloud-auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed?.currentSession?.user || parsed?.session?.user;
      if (!user || !user.email) return null;
      return { email: _normalize(user.email), userId: user.id };
    } catch (e) { return null; }
  }

  async function cloudSignUp({ email, senha, nome, telefone }) {
    await window.cloudReady;
    if (!_sb) return { error: 'Backend indisponível.' };
    email = _normalize(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'E-mail inválido.' };
    if (!senha || senha.length < 8) return { error: 'A senha precisa ter pelo menos 8 caracteres.' };
    const tel = String(telefone || '').replace(/\D/g, '');
    if (tel && tel.length < 10) return { error: 'Telefone inválido (mínimo 10 dígitos com DDD).' };
    const { data, error } = await _sb.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin + '/pintor/',
        data: { nome: nome || '', telefone: tel },
      },
    });
    if (error) return { error: error.message || 'Falha ao criar conta.' };
    // Se o cache local pertence a outra conta, não leva os dados para a nova.
    const donoAtual = _normalize(localStorage.getItem('pp-cloud-owner') || '');
    if (donoAtual && donoAtual !== email) { try { window.cloudWipeLocal?.(); } catch (e) {} }
    // Confirmação de e-mail está desligada (auto_confirm) → já entra logado.
    if (data.session) {
      _setStatus('pending');
      setTimeout(() => cloudSync().catch(() => {}), 400);
    }

    return { user: data.user };
  }

  async function cloudSignIn({ email, senha }) {
    await window.cloudReady;
    if (!_sb) return { error: 'Backend indisponível.' };
    const alvo = _normalize(email);
    const { data, error } = await _sb.auth.signInWithPassword({
      email: alvo,
      password: senha,
    });
    if (error) return { error: error.message || 'E-mail ou senha inválidos.' };
    // Conta diferente da dona do cache: limpa os dados locais antes de puxar.
    const dono = _normalize(localStorage.getItem('pp-cloud-owner') || '');
    if (dono && dono !== alvo) { try { window.cloudWipeLocal?.(); } catch (e) {} }
    _setStatus('pending');
    setTimeout(() => cloudSync().catch(() => {}), 400);
    return { user: data.user };
  }

  async function cloudSignOut() {
    await window.cloudReady;
    if (!_sb) return;
    await _sb.auth.signOut();
    // O cache local pertence à conta que saiu — limpa para não vazar de conta.
    try { window.cloudWipeLocal?.(); } catch (e) {}
    try { localStorage.removeItem('pp-cloud-owner'); } catch (e) {}
    try {
      window.renderHomeMini?.(); window.renderHomeEvents?.();
      window.renderOrcamentosList?.(); window.renderClientes?.();
      window.renderFornecedores?.(); window.renderAgenda?.();
      window.renderDashboard?.();
    } catch (e) {}
    _setStatus('offline');
  }


  async function cloudRecoverPassword(email) {
    await window.cloudReady;
    if (!_sb) return { error: 'Backend indisponível.' };
    email = _normalize(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'E-mail inválido.' };
    const { error } = await _sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/pintor/reset-password.html',
    });
    if (error) return { error: error.message || 'Falha ao enviar e-mail.' };
    return { ok: true };
  }

  // ── snapshot + merge (portados do drive-sync) ──
  function _snapshot() {
    const s = { versao: 3, ts: Date.now(), exportadoEm: new Date().toISOString() };
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      try { s[k] = v ? JSON.parse(v) : null; } catch (e) { s[k] = v; }
    }
    return s;
  }
  function _norm(v) { return String(v || '').trim().toLowerCase(); }
  function _digits(v) { return String(v || '').replace(/\D/g, ''); }
  function _key(type, x) {
    if (!x || typeof x !== 'object') return '';
    if (x.id != null && x.id !== '') return 'id:' + String(x.id);
    if (type === 'pp-clientes') {
      const t = _digits(x.tel); if (t) return 'tel:' + t;
      if (x.email) return 'email:' + _norm(x.email);
      if (x.cpf) return 'doc:' + _digits(x.cpf);
      if (x.nome) return 'nome:' + _norm(x.nome);
    }
    if (type === 'pp-fornecedores') {
      const t = _digits(x.tel); if (t) return 'tel:' + t;
      return ['forn', _norm(x.nome), _norm(x.cat)].join(':');
    }
    if (type === 'pp-eventos') return ['ev', _norm(x.tit), x.dat || '', x.hora || ''].join(':');
    return '';
  }
  function _ts(x) { return (x && (Number(x.tsEdit) || Number(x.ts) || Number(x.criadoEm))) || 0; }
  function _mergeArr(type, local, remote) {
    if (!Array.isArray(local)) return Array.isArray(remote) ? remote : [];
    if (!Array.isArray(remote)) return local;
    const map = new Map(); let n = 0;
    for (const x of local) { if (!x) continue; map.set(_key(type, x) || 'l:' + (++n), x); }
    for (const r of remote) {
      if (!r) continue;
      const k = _key(type, r) || 'r:' + (++n);
      const l = map.get(k);
      if (!l) { map.set(k, r); continue; }
      if (_ts(r) > _ts(l)) map.set(k, r);
    }
    return Array.from(map.values()).sort((a, b) => _ts(b) - _ts(a));
  }
  function _mergeCfg(l, r) {
    if (!l) return r || null;
    if (!r) return l || null;
    const lt = Number(l._ts) || 0, rt = Number(r._ts) || 0;
    if (lt || rt) return rt > lt ? r : l;
    return { ...r, ...l };
  }
  function _merge(local, remote) {
    if (!remote) return local;
    const out = { versao: 3, ts: Date.now(), exportadoEm: new Date().toISOString() };
    out['pp-orcs'] = _mergeArr('pp-orcs', local['pp-orcs'], remote['pp-orcs']);
    out['pp-clientes'] = _mergeArr('pp-clientes', local['pp-clientes'], remote['pp-clientes']);
    out['pp-fornecedores'] = _mergeArr('pp-fornecedores', local['pp-fornecedores'], remote['pp-fornecedores']);
    out['pp-eventos'] = _mergeArr('pp-eventos', local['pp-eventos'], remote['pp-eventos']);
    out['pp-config'] = _mergeCfg(local['pp-config'], remote['pp-config']);
    return out;
  }
  function _apply(s) {
    if (!s) return;
    let touched = false;
    for (const k of KEYS) {
      if (s[k] == null) continue;
      try { localStorage.setItem(k, JSON.stringify(s[k])); touched = true; } catch (e) {}
    }
    if (touched) {
      try {
        if (window.S) {
          if (s['pp-config']) window.S.config = { ...(window.defCfg || {}), ...s['pp-config'] };
          if (s['pp-orcs']) window.S.orcs = s['pp-orcs'];
          if (s['pp-clientes']) window.S.clientes = s['pp-clientes'];
          if (s['pp-fornecedores']) window.S.fornecedores = s['pp-fornecedores'];
          if (s['pp-eventos']) window.S.eventos = s['pp-eventos'];
        }
        window.renderHomeMini?.(); window.renderHomeEvents?.();
        window.renderOrcamentosList?.(); window.renderClientes?.();
        window.renderFornecedores?.(); window.renderAgenda?.();
        window.renderDashboard?.();
      } catch (e) {}
    }
  }

  // ── Isolamento por conta ──
  // O cache local pertence a UMA conta. Se outra conta entrar no mesmo
  // navegador, os dados locais NÃO podem ser enviados para ela.
  const OWNER_KEY = 'pp-cloud-owner';
  function _owner() { return _normalize(localStorage.getItem(OWNER_KEY) || ''); }
  function _setOwner(email) { localStorage.setItem(OWNER_KEY, _normalize(email)); }
  function _wipeLocal() {
    for (const k of KEYS) { try { localStorage.removeItem(k); } catch (e) {} }
    try {
      if (window.S) {
        window.S.config = { ...(window.defCfg || {}) };
        window.S.orcs = []; window.S.clientes = [];
        window.S.fornecedores = []; window.S.eventos = [];
      }
      localStorage.removeItem('pp-cloud-lastSync');
    } catch (e) {}
  }
  function _emptySnapshot() {
    const s = { versao: 3, ts: Date.now(), exportadoEm: new Date().toISOString() };
    for (const k of KEYS) s[k] = null;
    return s;
  }
  window.cloudWipeLocal = _wipeLocal;

  async function cloudSync() {
    await window.cloudReady;
    if (!_sb) return false;
    if (_syncing) return false;
    const sess = (await _sb.auth.getSession()).data.session;
    if (!sess) { _setStatus('offline'); return false; }
    const email = _normalize(sess.user.email);
    if (!email) { _setStatus('error'); _setErr('Conta sem e-mail.'); return false; }
    _syncing = true; _setStatus('syncing');
    try {
      const owner = _owner();
      const foreign = !!owner && owner !== email;
      if (foreign) _wipeLocal();
      const local = foreign ? _emptySnapshot() : _snapshot();
      const { data: rows, error: selErr } = await _sb
        .from('backups').select('data, updated_at').eq('email', email).maybeSingle();
      if (selErr && selErr.code !== 'PGRST116') throw selErr;
      const remote = rows?.data || null;
      _setOwner(email);

      const merged = _merge(local, remote);
      _apply(merged);
      const deviceId = localStorage.getItem('pp-device-id') || 'dev_' + Date.now();
      const { error: upErr } = await _sb.from('backups').upsert({
        email,
        data: merged,
        updated_by: sess.user.id,
        device_id: deviceId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      if (upErr) throw upErr;
      localStorage.setItem('pp-cloud-lastSync', new Date().toISOString());
      _setErr(''); _setStatus('ok');
      return true;
    } catch (e) {
      console.warn('[cloud-sync] falhou', e);
      _setErr(e?.message || 'Falha ao sincronizar com a nuvem.');
      _setStatus('error');
      return false;
    } finally {
      _syncing = false;
    }
  }

  // ── Agendamento automático ──
  let _schedTimer = null;
  function cloudScheduleSync(delay) {
    if (!cloudGetSession()) return;
    _setStatus('pending');
    clearTimeout(_schedTimer);
    _schedTimer = setTimeout(() => { cloudSync().catch(() => {}); }, typeof delay === 'number' ? delay : 3000);
  }

  // Encadeia no scheduleSync do Drive (definido depois deste script)
  function _hookScheduleSync() {
    const prev = typeof window.scheduleSync === 'function' ? window.scheduleSync : null;
    if (window.__ppCloudHooked) return;
    window.__ppCloudHooked = true;
    window.scheduleSync = function (delay) {
      try { prev?.(delay); } catch (e) {}
      cloudScheduleSync(delay);
    };
  }
  if (document.readyState === 'complete') _hookScheduleSync();
  else window.addEventListener('load', _hookScheduleSync);

  // Puxa dados da nuvem ao voltar para o app / reconectar / a cada 5 min
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') cloudScheduleSync(600);
  });
  window.addEventListener('online', () => cloudScheduleSync(600));
  setInterval(() => { if (navigator.onLine) cloudScheduleSync(0); }, 5 * 60 * 1000);

  window.cloudGetSession = cloudGetSession;
  window.cloudSignUp = cloudSignUp;
  window.cloudSignIn = cloudSignIn;
  window.cloudSignOut = cloudSignOut;
  window.cloudRecoverPassword = cloudRecoverPassword;
  window.cloudSync = cloudSync;
  window.cloudScheduleSync = cloudScheduleSync;
  window.getCloudStatus = getCloudStatus;
  window.getCloudLastError = getCloudLastError;
})();
