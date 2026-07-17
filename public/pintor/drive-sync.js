/* Pintor Plus — Google Drive sync (appDataFolder)
 * Sincroniza pp-config, pp-orcs (com fotos base64), pp-clientes,
 * pp-fornecedores, pp-eventos como um único JSON no appDataFolder
 * do Google Drive do usuário.
 *
 * Exponibilizado:
 *   ppGetUser / ppHandleCredential / ppSignIn / ppSignOut
 *   gSignIn(interactive?)  -> access_token (drive.appdata)
 *   backupAutoSync()       -> Promise<boolean>  (merge + upload)
 *   scheduleSync(delay?)   -> agenda debounce
 *   executeSync()          -> força sync imediato
 *   getSyncStatus()        -> 'idle'|'pending'|'syncing'|'ok'|'error'|'offline'
 */
(function () {
  'use strict';

  const FILE_NAME = 'pintor-plus-backup.json';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
  const DRIVE_API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
  const KEYS = ['pp-config', 'pp-orcs', 'pp-clientes', 'pp-fornecedores', 'pp-eventos'];

  let _clientId = '';
  let _tokenClient = null;
  let _accessToken = '';
  let _accessTokenExp = 0;
  let _syncTimer = null;
  let _syncing = false;
  let _lastFileId = localStorage.getItem('pp-gdrive-fileId') || '';
  let _lastError = '';
  let _status = 'offline';

  function _getDeviceId() {
    let id = localStorage.getItem('pp-device-id') || '';
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('pp-device-id', id);
    }
    return id;
  }

  function _setStatus(s) {
    _status = s;
    try { window.renderSyncStatus?.(); } catch (e) {}
    try { window.renderGdriveConfig?.(); } catch (e) {}
  }
  function getSyncStatus() { return _status; }
  function _setLastError(message) {
    _lastError = message || '';
    if (_lastError) localStorage.setItem('pp-gdrive-lastError', _lastError);
    else localStorage.removeItem('pp-gdrive-lastError');
  }
  function getSyncLastError() { return _lastError || localStorage.getItem('pp-gdrive-lastError') || ''; }
  async function _readErrorBody(response) {
    try {
      const text = await response.text();
      if (!text) return '';
      try {
        const json = JSON.parse(text);
        return json?.error?.message || json?.error_description || text.slice(0, 300);
      } catch (e) {
        return text.slice(0, 300);
      }
    } catch (e) { return ''; }
  }
  function _classifyDriveError(status, body) {
    const b = String(body || '');
    if (status === 401) return 'Sessão do Google expirou. Clique em "Sincronizar agora" para autorizar novamente.';
    if (status === 403) {
      if (/Drive API has not been used|accessNotConfigured|SERVICE_DISABLED/i.test(b))
        return 'Ative a Google Drive API no Google Cloud Console (APIs e Serviços → Biblioteca → Google Drive API → Ativar) e tente de novo.';
      if (/insufficientPermissions|insufficient authentication scopes|forbidden/i.test(b))
        return 'Permissão do Drive negada. Clique em "Sincronizar agora" e aceite o acesso ao Drive na tela do Google.';
      if (/storageQuotaExceeded|quotaExceeded/i.test(b))
        return 'Armazenamento do Google Drive esgotado. Libere espaço na sua conta e tente de novo.';
      return 'Google recusou o acesso (403). Verifique se a Google Drive API está ativada e se este domínio está autorizado no Client OAuth.';
    }
    if (status === 404) return 'Backup do Drive não encontrado — será recriado no próximo envio.';
    return `Erro ${status} do Google Drive: ${b.slice(0, 200)}`;
  }


  async function boot() {
    try {
      const r = await fetch('/api/public/google-config', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        _clientId = j.clientId || '';
        window.__VITE_GOOGLE_CLIENT_ID__ = _clientId;
      }
    } catch (e) { console.warn('[drive-sync] config fetch falhou', e); }
    if (!document.querySelector('script[data-gis]')) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true; s.dataset.gis = '1';
      document.head.appendChild(s);
    }
    const u = ppGetUser();
    if (u && u.email) {
      _setStatus('pending');
      const wait = setInterval(() => {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          clearInterval(wait);
          scheduleSync(1500);
        }
      }, 200);
      setTimeout(() => clearInterval(wait), 15000);
    } else {
      _setStatus('offline');
    }
  }

  // ── auth ──
  function ppGetUser() {
    try { return JSON.parse(localStorage.getItem('pp-auth-user') || 'null'); }
    catch (e) { return null; }
  }
  function _decodeJwt(t) {
    try {
      const p = t.split('.')[1];
      const j = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(escape(j)));
    } catch (e) { return null; }
  }
  function ppHandleCredential(credential) {
    const p = _decodeJwt(credential);
    if (!p) return null;
    const user = {
      uid: p.sub, email: p.email || '',
      name: p.name || p.email || 'Usuário',
      picture: p.picture || '',
      signedInAt: new Date().toISOString(),
    };
    localStorage.setItem('pp-auth-user', JSON.stringify(user));
    localStorage.setItem('pp-gdrive-email', user.email);
    _setStatus('pending');
    return user;
  }
  async function ppSignOut() {
    _accessToken = ''; _accessTokenExp = 0;
    try { if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect(); } catch (e) {}
    localStorage.removeItem('pp-auth-user');
    localStorage.removeItem('pp-gdrive-token');
    _setStatus('offline');
  }
  async function ppSignIn() {
    const token = await gSignIn(true);
    if (!token) return null;
    try {
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const p = await r.json();
      const user = {
        uid: p.sub, email: p.email || '',
        name: p.name || p.email || 'Usuário',
        picture: p.picture || '',
        signedInAt: new Date().toISOString(),
      };
      const prevEmail = localStorage.getItem('pp-gdrive-email') || '';
      if (prevEmail && user.email && prevEmail !== user.email) {
        _lastFileId = '';
        localStorage.removeItem('pp-gdrive-fileId');
      }
      localStorage.setItem('pp-auth-user', JSON.stringify(user));
      localStorage.setItem('pp-gdrive-email', user.email);
      _setStatus('pending');
      return user;
    } catch (e) { return null; }
  }

  function _initTokenClient() {
    if (_tokenClient) return _tokenClient;
    if (!window.google?.accounts?.oauth2) return null;
    if (!_clientId) return null;
    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: _clientId, scope: SCOPE, prompt: '', callback: () => {},
    });
    return _tokenClient;
  }
  function gSignIn(interactive) {
    return new Promise((resolve) => {
      if (_accessToken && Date.now() < _accessTokenExp - 30_000) return resolve(_accessToken);
      const tc = _initTokenClient();
      if (!tc) {
        _setLastError(!_clientId ? 'Client ID do Google não carregou.' : 'Google Identity Services ainda não carregou.');
        return resolve('');
      }
      tc.callback = (resp) => {
        if (resp && resp.access_token) {
          _setLastError('');
          _accessToken = resp.access_token;
          _accessTokenExp = Date.now() + ((resp.expires_in || 3600) * 1000);
          localStorage.setItem('pp-gdrive-token', JSON.stringify({ t: _accessToken, e: _accessTokenExp }));
          resolve(_accessToken);
        } else {
          _setLastError(resp?.error_description || resp?.error || 'Permissão do Google não retornou token.');
          resolve('');
        }
      };
      try { tc.requestAccessToken({ prompt: interactive ? 'consent' : '' }); }
      catch (e) { _setLastError(e?.message || 'Falha ao abrir permissão do Google.'); resolve(''); }
    });
  }

  // ── Drive REST ──
  async function _listBackupFiles(token) {
    const q = encodeURIComponent(`name='${FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
    const r = await fetch(`${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime,createdTime,size)&orderBy=modifiedTime desc&pageSize=100`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!r.ok) { const b = await _readErrorBody(r); throw new Error(_classifyDriveError(r.status, b)); }
    const j = await r.json();
    return Array.isArray(j.files) ? j.files : [];
  }
  async function _findFile(token, forceFresh) {
    if (_lastFileId && !forceFresh) return _lastFileId;
    const files = await _listBackupFiles(token);
    const f = files[0];
    if (f) { _lastFileId = f.id; localStorage.setItem('pp-gdrive-fileId', f.id); }
    else { _lastFileId = ''; localStorage.removeItem('pp-gdrive-fileId'); }
    return _lastFileId;
  }
  async function _downloadFile(token, id) {
    const r = await fetch(`${DRIVE_API}/files/${id}?alt=media`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (r.status === 404 || r.status === 403) { _lastFileId = ''; localStorage.removeItem('pp-gdrive-fileId'); return null; }
    if (!r.ok) { const b = await _readErrorBody(r); throw new Error(_classifyDriveError(r.status, b)); }
    try { return await r.json(); } catch (e) { return null; }
  }
  async function _trashFile(token, id) {
    if (!id) return false;
    const r = await fetch(`${DRIVE_API}/files/${id}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ trashed: true }),
    });
    return r.ok;
  }
  async function _resumableUploadFile(token, id, bodyText) {
    const meta = id ? {} : { name: FILE_NAME, parents: ['appDataFolder'] };
    const initUrl = id
      ? `${UPLOAD_API}/files/${id}?uploadType=resumable`
      : `${UPLOAD_API}/files?uploadType=resumable`;
    const init = await fetch(initUrl, {
      method: id ? 'PATCH' : 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(new Blob([bodyText]).size),
      },
      body: JSON.stringify(meta),
    });
    if ((init.status === 404 || init.status === 403) && id) {
      _lastFileId = ''; localStorage.removeItem('pp-gdrive-fileId');
      return _resumableUploadFile(token, '', bodyText);
    }
    if (!init.ok) { const b = await _readErrorBody(init); throw new Error(_classifyDriveError(init.status, b)); }
    const uploadUrl = init.headers.get('Location') || init.headers.get('location');
    if (!uploadUrl) throw new Error('drive upload init sem URL de envio');
    const up = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: bodyText,
    });
    if ((up.status === 404 || up.status === 403) && id) {
      _lastFileId = ''; localStorage.removeItem('pp-gdrive-fileId');
      return _resumableUploadFile(token, '', bodyText);
    }
    if (!up.ok) { const b = await _readErrorBody(up); throw new Error(_classifyDriveError(up.status, b)); }
    return await up.json();
  }
  async function _uploadFile(token, id, body) {
    const bodyText = JSON.stringify(body);
    // Backups com fotos em base64 passam fácil do limite prático do upload multipart.
    // Upload resumível aceita arquivos grandes e é mais estável no celular.
    const resumable = await _resumableUploadFile(token, id, bodyText);
    if (resumable && resumable.id) {
      _lastFileId = resumable.id;
      localStorage.setItem('pp-gdrive-fileId', resumable.id);
    }
    return resumable;

    const boundary = '-------pp' + Date.now();
    const meta = id ? {} : { name: FILE_NAME, parents: ['appDataFolder'] };
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(meta) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      JSON.stringify(body) +
      `\r\n--${boundary}--`;
    const url = id
      ? `${UPLOAD_API}/files/${id}?uploadType=multipart`
      : `${UPLOAD_API}/files?uploadType=multipart`;
    let r = await fetch(url, {
      method: id ? 'PATCH' : 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipart,
    });
    // Se o id sumiu (usuário apagou do Drive), reenvia como criação.
    if (r.status === 404 && id) {
      _lastFileId = ''; localStorage.removeItem('pp-gdrive-fileId');
      return _uploadFile(token, '', body);
    }
    if (!r.ok) throw new Error('drive upload ' + r.status + ' ' + await _readErrorBody(r));
    const j = await r.json();
    if (j.id) { _lastFileId = j.id; localStorage.setItem('pp-gdrive-fileId', j.id); }
    return j;
  }

  // ── snapshot + merge ──
  function _normalizeSnapshot(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const s = { ...raw };
    // Compatibilidade com backups exportados manualmente antes do sync por Drive.
    if (s.config && !s['pp-config']) s['pp-config'] = s.config;
    if (s.orcs && !s['pp-orcs']) s['pp-orcs'] = s.orcs;
    if (s.clientes && !s['pp-clientes']) s['pp-clientes'] = s.clientes;
    if (s.fornecedores && !s['pp-fornecedores']) s['pp-fornecedores'] = s.fornecedores;
    if (s.eventos && !s['pp-eventos']) s['pp-eventos'] = s.eventos;
    return s;
  }

  function _snapshot() {
    const s = { versao: 3, ts: Date.now(), exportadoEm: new Date().toISOString(), deviceId: _getDeviceId(), contaGoogle: localStorage.getItem('pp-gdrive-email') || '' };
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      try { s[k] = v ? JSON.parse(v) : null; } catch (e) { s[k] = v; }
    }
    return s;
  }
  function _normText(v) { return String(v || '').trim().toLowerCase(); }
  function _digits(v) { return String(v || '').replace(/\D/g, ''); }
  function _recordKey(type, x) {
    if (!x || typeof x !== 'object') return '';
    if (x.id != null && x.id !== '') return 'id:' + String(x.id);
    if (type === 'pp-clientes') {
      const tel = _digits(x.tel); if (tel) return 'tel:' + tel;
      if (x.email) return 'email:' + _normText(x.email);
      if (x.cpf) return 'doc:' + _digits(x.cpf);
      if (x.nome) return 'nome:' + _normText(x.nome);
    }
    if (type === 'pp-fornecedores') {
      const tel = _digits(x.tel); if (tel) return 'tel:' + tel;
      return ['forn', _normText(x.nome), _normText(x.cat)].join(':');
    }
    if (type === 'pp-eventos') {
      return ['ev', _normText(x.tit), x.dat || '', x.hora || ''].join(':');
    }
    return '';
  }
  function _touchTs(x) {
    return (x && (Number(x.tsEdit) || Number(x.ts) || Number(x.criadoEm))) || 0;
  }
  function _mergeArrayById(type, local, remote) {
    if (!Array.isArray(local)) return Array.isArray(remote) ? remote : [];
    if (!Array.isArray(remote)) return local;
    const map = new Map();
    let loose = 0;
    for (const x of local) {
      if (!x) continue;
      const k = _recordKey(type, x) || 'local:' + (++loose);
      map.set(k, x);
    }
    for (const r of remote) {
      if (!r) continue;
      const k = _recordKey(type, r) || 'remote:' + (++loose);
      const l = map.get(k);
      if (!l) { map.set(k, r); continue; }
      const lt = _touchTs(l);
      const rt = _touchTs(r);
      if (rt > lt || (!lt && !rt && JSON.stringify(r).length > JSON.stringify(l).length)) map.set(k, r);
    }
    return Array.from(map.values()).sort((a, b) => _touchTs(b) - _touchTs(a));
  }
  function _configHasUsefulData(cfg) {
    return !!(cfg && typeof cfg === 'object' && (cfg.empresa || cfg.tel || cfg.doc || cfg.emailEmpresa || cfg.endEmpresa || cfg.logo || cfg.assinatura));
  }
  function _mergeConfig(localCfg, remoteCfg) {
    if (!localCfg) return remoteCfg || null;
    if (!remoteCfg) return localCfg || null;
    const lt = Number(localCfg._ts) || 0;
    const rt = Number(remoteCfg._ts) || 0;
    if (lt || rt) return rt > lt ? remoteCfg : localCfg;
    if (!_configHasUsefulData(localCfg) && _configHasUsefulData(remoteCfg)) return remoteCfg;
    if (_configHasUsefulData(localCfg) && !_configHasUsefulData(remoteCfg)) return localCfg;
    return { ...remoteCfg, ...localCfg };
  }
  function _mergeSnapshot(local, remote) {
    const l = _normalizeSnapshot(local) || _snapshot();
    const r = _normalizeSnapshot(remote);
    if (!r) return l;
    const out = { versao: 3, ts: Date.now(), exportadoEm: new Date().toISOString(), deviceId: _getDeviceId(), contaGoogle: localStorage.getItem('pp-gdrive-email') || '' };
    out['pp-orcs'] = _mergeArrayById('pp-orcs', l['pp-orcs'], r['pp-orcs']);
    out['pp-clientes'] = _mergeArrayById('pp-clientes', l['pp-clientes'], r['pp-clientes']);
    out['pp-fornecedores'] = _mergeArrayById('pp-fornecedores', l['pp-fornecedores'], r['pp-fornecedores']);
    out['pp-eventos'] = _mergeArrayById('pp-eventos', l['pp-eventos'], r['pp-eventos']);
    out['pp-config'] = _mergeConfig(l['pp-config'], r['pp-config']);
    return out;
  }
  function _applySnapshot(s) {
    s = _normalizeSnapshot(s);
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
          if (window.S.config) {
            window.S.DEFAULT_SERVICES = (window.S.config.servicos || window.defCfg?.servicos || '').split(',').map(x => x.trim()).filter(Boolean);
            window.S.statusArr = (window.S.config.statusList || window.defCfg?.statusList || '').split(',').map(x => x.trim()).filter(Boolean);
          }
        }
        if (window.Storage?.isReady && s['pp-orcs']) window.Storage.saveOrcs(s['pp-orcs']).catch(() => {});
        window.ppApplyA11y?.();
        window.populateStatusSelect?.();
        window.renderHomeMini?.();
        window.renderHomeEvents?.();
        window.renderOrcamentosList?.();
        window.renderClientes?.();
        window.renderFornecedores?.();
        window.renderAgenda?.();
        window.renderDashboard?.();
        window.renderGoogleStatus?.();
        window.renderGdriveConfig?.();
      } catch (e) {}
    }
  }

  async function backupAutoSync(options) {
    const interactive = !!(options && options.interactive);
    if (_syncing) return false;
    _syncing = true; _setStatus('syncing');
    try {
      const token = await gSignIn(interactive);
      if (!token) { _setStatus(ppGetUser() ? 'error' : 'offline'); return false; }
      let merged = _snapshot();
      let files = [];
      try { files = await _listBackupFiles(token); } catch (e) { files = []; }
      const knownIds = new Set(files.map(f => f.id).filter(Boolean));
      if (_lastFileId && !knownIds.has(_lastFileId)) {
        try {
          const cachedRemote = await _downloadFile(token, _lastFileId);
          if (cachedRemote) files.push({ id: _lastFileId, modifiedTime: cachedRemote.exportadoEm || '' });
        } catch (e) {
          _lastFileId = '';
          localStorage.removeItem('pp-gdrive-fileId');
        }
      }
      for (const f of files) {
        if (!f || !f.id) continue;
        const remote = await _downloadFile(token, f.id);
        if (remote) merged = _mergeSnapshot(merged, remote);
      }
      _applySnapshot(merged);
      const canonicalId = (files[0] && files[0].id) || _lastFileId || '';
      const uploaded = await _uploadFile(token, canonicalId, merged);
      const finalId = uploaded?.id || canonicalId;
      if (finalId) {
        _lastFileId = finalId;
        localStorage.setItem('pp-gdrive-fileId', finalId);
      }
      // Se aparelhos antigos criaram backups separados, consolida tudo em um só arquivo.
      const duplicates = files.map(f => f.id).filter(id => id && id !== finalId);
      for (const id of duplicates) {
        _trashFile(token, id).catch(() => {});
      }
      localStorage.setItem('pp-gdrive-lastSync', new Date().toISOString());
      localStorage.setItem('pp-gdrive-backupCount', String(Math.max(1, files.length || (finalId ? 1 : 0))));
      _setLastError('');
      _setStatus('ok');
      return true;
    } catch (e) {
      console.warn('[drive-sync] falhou', e);
      _setLastError(e?.message || 'Falha desconhecida ao sincronizar.');
      _setStatus('error');
      return false;
    } finally {
      _syncing = false;
    }
  }
  function scheduleSync(delay) {
    if (ppGetUser()) _setStatus('pending');
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => { backupAutoSync(); }, typeof delay === 'number' ? delay : 4000);
  }
  async function executeSync(options) { return await backupAutoSync(options); }

  try {
    const t = JSON.parse(localStorage.getItem('pp-gdrive-token') || 'null');
    if (t && t.t && t.e && Date.now() < t.e - 60_000) { _accessToken = t.t; _accessTokenExp = t.e; }
  } catch (e) {}

  window.ppGetUser = ppGetUser;
  window.ppHandleCredential = ppHandleCredential;
  window.ppSignIn = ppSignIn;
  window.ppSignOut = ppSignOut;
  window.gSignIn = gSignIn;
  window.backupAutoSync = backupAutoSync;
  window.scheduleSync = scheduleSync;
  window.executeSync = executeSync;
  window.getSyncStatus = getSyncStatus;
  window.getSyncLastError = getSyncLastError;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
