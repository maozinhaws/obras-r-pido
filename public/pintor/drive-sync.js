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
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
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
  let _status = 'offline';

  function _setStatus(s) {
    _status = s;
    try { window.renderSyncStatus?.(); } catch (e) {}
    try { window.renderGdriveConfig?.(); } catch (e) {}
  }
  function getSyncStatus() { return _status; }

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
      if (!tc) return resolve('');
      tc.callback = (resp) => {
        if (resp && resp.access_token) {
          _accessToken = resp.access_token;
          _accessTokenExp = Date.now() + ((resp.expires_in || 3600) * 1000);
          localStorage.setItem('pp-gdrive-token', JSON.stringify({ t: _accessToken, e: _accessTokenExp }));
          resolve(_accessToken);
        } else resolve('');
      };
      try { tc.requestAccessToken({ prompt: interactive ? 'consent' : '' }); }
      catch (e) { resolve(''); }
    });
  }

  // ── Drive REST ──
  async function _findFile(token, forceFresh) {
    if (_lastFileId && !forceFresh) return _lastFileId;
    const q = encodeURIComponent(`name='${FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
    const r = await fetch(`${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!r.ok) throw new Error('drive list ' + r.status);
    const j = await r.json();
    const f = (j.files || [])[0];
    if (f) { _lastFileId = f.id; localStorage.setItem('pp-gdrive-fileId', f.id); }
    else { _lastFileId = ''; localStorage.removeItem('pp-gdrive-fileId'); }
    return _lastFileId;
  }
  async function _downloadFile(token, id) {
    const r = await fetch(`${DRIVE_API}/files/${id}?alt=media`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (r.status === 404) { _lastFileId = ''; localStorage.removeItem('pp-gdrive-fileId'); return null; }
    if (!r.ok) return null;
    try { return await r.json(); } catch (e) { return null; }
  }
  async function _uploadFile(token, id, body) {
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
    if (!r.ok) throw new Error('drive upload ' + r.status);
    const j = await r.json();
    if (j.id) { _lastFileId = j.id; localStorage.setItem('pp-gdrive-fileId', j.id); }
    return j;
  }

  // ── snapshot + merge ──
  function _snapshot() {
    const s = { versao: 1, ts: Date.now(), exportadoEm: new Date().toISOString() };
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      try { s[k] = v ? JSON.parse(v) : null; } catch (e) { s[k] = v; }
    }
    return s;
  }
  function _mergeArrayById(local, remote) {
    if (!Array.isArray(local)) return Array.isArray(remote) ? remote : [];
    if (!Array.isArray(remote)) return local;
    const map = new Map();
    for (const x of local) if (x && x.id != null) map.set(String(x.id), x);
    for (const r of remote) {
      if (!r || r.id == null) continue;
      const k = String(r.id);
      const l = map.get(k);
      if (!l) { map.set(k, r); continue; }
      const lt = l.tsEdit || l.ts || 0;
      const rt = r.tsEdit || r.ts || 0;
      if (rt > lt) map.set(k, r);
    }
    return Array.from(map.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }
  function _mergeSnapshot(local, remote) {
    if (!remote) return local;
    const out = { ..._snapshot() };
    out['pp-orcs'] = _mergeArrayById(local['pp-orcs'], remote['pp-orcs']);
    out['pp-clientes'] = _mergeArrayById(local['pp-clientes'], remote['pp-clientes']);
    out['pp-fornecedores'] = _mergeArrayById(local['pp-fornecedores'], remote['pp-fornecedores']);
    out['pp-eventos'] = _mergeArrayById(local['pp-eventos'], remote['pp-eventos']);
    const localCfgTs = (local['pp-config'] && local['pp-config']._ts) || 0;
    const remoteCfgTs = (remote['pp-config'] && remote['pp-config']._ts) || 0;
    out['pp-config'] = remoteCfgTs > localCfgTs ? remote['pp-config'] : local['pp-config'];
    return out;
  }
  function _applySnapshot(s) {
    let touched = false;
    for (const k of KEYS) {
      if (s[k] == null) continue;
      try { localStorage.setItem(k, JSON.stringify(s[k])); touched = true; } catch (e) {}
    }
    if (touched) {
      try {
        if (window.S) {
          if (s['pp-config']) window.S.config = s['pp-config'];
          if (s['pp-orcs']) window.S.orcs = s['pp-orcs'];
          if (s['pp-clientes']) window.S.clientes = s['pp-clientes'];
          if (s['pp-fornecedores']) window.S.fornecedores = s['pp-fornecedores'];
          if (s['pp-eventos']) window.S.eventos = s['pp-eventos'];
        }
        window.renderHomeMini?.();
        window.renderHomeEvents?.();
        window.renderOrcs?.();
      } catch (e) {}
    }
  }

  async function backupAutoSync() {
    if (_syncing) return false;
    _syncing = true; _setStatus('syncing');
    try {
      const token = await gSignIn();
      if (!token) { _setStatus(ppGetUser() ? 'error' : 'offline'); return false; }
      const local = _snapshot();
      let fileId = '';
      try { fileId = await _findFile(token); } catch (e) { fileId = ''; }
      const remote = fileId ? await _downloadFile(token, fileId) : null;
      const merged = _mergeSnapshot(local, remote);
      _applySnapshot(merged);
      await _uploadFile(token, fileId, merged);
      localStorage.setItem('pp-gdrive-lastSync', new Date().toISOString());
      _setStatus('ok');
      return true;
    } catch (e) {
      console.warn('[drive-sync] falhou', e);
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
  async function executeSync() { return await backupAutoSync(); }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
