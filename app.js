/* TOOL IPC — giao diện web (GĐ1). Gọi API Apps Script kèm Google ID token.
 * Logic kiểm tra dữ liệu dùng chung với máy chủ: logic.js (biến IPC). */
'use strict';
const CFG = window.IPC_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vn = d => IPC.vn(d);

const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  upload: '<path d="M12 15V3m0 0-4 4m4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  gear: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  down: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  report: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

/* ================= Thông báo, hộp thoại ================= */
let toastT;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, err ? 6000 : 3000);
}
// Hộp thoại: trả về Promise<giá trị nút bấm | null>
function dialog({ title, body, buttons, onOpen }) {
  return new Promise(res => {
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<div class="dlg-h"><h2>${esc(title)}</h2></div><div class="dlg-b">${body}</div><div class="dlg-f"></div>`;
    const f = $('.dlg-f', d);
    (buttons || [{ l: 'Đóng', v: null }]).forEach(b => {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn ' + (b.cls || ''); x.textContent = b.l;
      x.onclick = async () => {
        if (b.check) { const ok = await b.check(d); if (!ok) return; }
        d.close(); res(b.v === undefined ? b.l : (typeof b.v === 'function' ? b.v(d) : b.v));
      };
      f.appendChild(x);
    });
    d.addEventListener('cancel', () => res(null));
    d.addEventListener('close', () => setTimeout(() => d.remove(), 50));
    document.body.appendChild(d); d.showModal();
    if (onOpen) onOpen(d);
  });
}
const confirmDlg = (title, body, okLabel, cls) => dialog({ title, body: `<p>${body}</p>`, buttons: [{ l: 'Hủy', v: false }, { l: okLabel, v: true, cls: cls || 'primary' }] });

/* ================= Đăng nhập & gọi API ================= */
const Auth = {
  tok: null, exp: 0, wait: null,
  load() { try { const o = JSON.parse(sessionStorage.getItem('ipc_idt') || 'null'); if (o && o.exp * 1000 > Date.now() + 60000) { this.tok = o.t; this.exp = o.exp; } } catch (e) { } },
  save(t) {
    let exp = 0; try { exp = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp; } catch (e) { }
    this.tok = t; this.exp = exp; try { sessionStorage.setItem('ipc_idt', JSON.stringify({ t, exp })); } catch (e) { }
  },
  clear() { this.tok = null; this.exp = 0; try { sessionStorage.removeItem('ipc_idt'); } catch (e) { } },
  gis() {
    return new Promise((res, rej) => {
      let n = 0; const t = setInterval(() => {
        if (window.google && google.accounts && google.accounts.id) { clearInterval(t); res(); }
        else if (++n > 100) { clearInterval(t); rej(new Error('Không tải được dịch vụ đăng nhập Google. Kiểm tra mạng rồi tải lại trang.')); }
      }, 100);
    });
  },
  async token() {
    if (CFG.dev) { // Chế độ chạy thử trên máy (tests/dev-server.js): chọn email, không qua Google
      let e = ''; try { e = sessionStorage.getItem('ipc_dev') || ''; } catch (x) { }
      if (e) return 'dev:' + e;
      return new Promise(res => gate({ dev: true, onDev: em => { try { sessionStorage.setItem('ipc_dev', em); } catch (x) { } res('dev:' + em); } }));
    }
    if (!this.tok) this.load();
    if (this.tok && this.exp * 1000 > Date.now() + 60000) return this.tok;
    if (this.wait) return this.wait;
    this.wait = (async () => {
      await this.gis();
      return await new Promise(res => {
        google.accounts.id.initialize({ client_id: CFG.clientId, auto_select: true, cancel_on_tap_outside: false, ux_mode: 'popup', callback: r => { this.save(r.credential); res(r.credential); } });
        gate({});
        google.accounts.id.renderButton($('#gsi-btn'), { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', locale: 'vi', width: 280 });
        google.accounts.id.prompt();
      });
    })();
    try { return await this.wait; } finally { this.wait = null; }
  },
  signOut() {
    this.clear(); try { sessionStorage.removeItem('ipc_dev'); } catch (e) { }
    try { google.accounts.id.disableAutoSelect(); } catch (e) { }
    location.hash = ''; location.reload();
  }
};
async function api(action, payload, retried) {
  const tok = await Auth.token();
  let res;
  try {
    res = await fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ idToken: tok, action, payload: payload || {} }), redirect: 'follow', credentials: 'omit', referrerPolicy: 'no-referrer' });
  } catch (e) { throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'); }
  let r; try { r = JSON.parse(await res.text()); } catch (e) { throw new Error('Máy chủ phản hồi không hợp lệ (mã ' + res.status + ').'); }
  if (r && r.auth && !retried) { Auth.clear(); return api(action, payload, true); }
  if (r && r.denied) { const e = new Error(r.error); e.denied = true; throw e; }
  return r;
}
// Gọi API, lỗi thì báo và ném tiếp
async function call(action, payload) {
  const r = await api(action, payload);
  if (!r || r.ok === false) { const e = new Error((r && r.error) || 'Lỗi máy chủ'); e.data = r; throw e; }
  return r;
}

function gate(o) {
  $('#loading').hidden = true;
  const app = $('#app'); app.hidden = false;
  let inner;
  if (o.dev) inner = `<div class="alert info">Chế độ chạy thử trên máy: nhập email một tài khoản đã có trong danh sách nhân sự.</div>
      <form class="dev-pick"><label class="f">Email<input class="in" name="e" type="email" required autocomplete="email"></label><button class="btn primary">Vào chạy thử</button></form>`;
  else if (o.config) inner = `<div class="err">${esc(o.config)}</div>`;
  else inner = `${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}<div id="gsi-btn"></div>
      ${o.error ? `<p class="foot"><button class="btn" id="sw">Đăng nhập tài khoản khác</button></p>` : ''}`;
  app.innerHTML = `<div class="gate"><div class="gate-card">
    <img src="assets/logo-fpt.webp" alt="FPT Telecom" width="84" height="51">
    <h1>Quản trị dự án IPC</h1>
    <p>Theo dõi tiến độ đầu tư hạ tầng viễn thông tòa nhà và khu đô thị.</p>
    ${inner}
    <p class="foot">Đăng nhập bằng tài khoản Google đã được Giám đốc trung tâm cấp quyền. Mỗi người chỉ xem dự án trong phạm vi của mình.</p>
  </div></div>`;
  const f = $('.dev-pick', app);
  if (f) f.onsubmit = e => { e.preventDefault(); o.onDev(f.e.value.trim().toLowerCase()); };
  const sw = $('#sw', app); if (sw) sw.onclick = () => Auth.signOut();
}

/* ================= Trạng thái ================= */
const S = { projects: null, filters: { q: '', phong: '', pm: '', kv: '', health: '', stage: '' }, showDeleted: false, dirty: false };
const ROLE_NAME = { BGD: 'Giám đốc trung tâm', TP: 'Trưởng phòng', PM: 'Cán bộ đầu tư', CBDS: 'Cán bộ đối soát' };
const ST_TEXT = { xong: 'Đã xong', xong_tre: 'Xong trễ hạn', qua_han: 'Quá hạn', sap_han: 'Sắp đến hạn', dung_han: 'Đúng tiến độ', cho: 'Chưa đến bước' };
const HEALTH_TEXT = { qua_han: 'Có mốc quá hạn', sap_han: 'Có mốc sắp đến hạn', on: 'Đúng tiến độ' };

function setInit(r) {
  Object.assign(S, { me: r.me, perms: r.perms, cfg: r.cfg, today: r.today, hol: r.holidays || {}, kv: r.kv, cn: r.cn, users: r.users });
  S.userMap = {}; r.users.forEach(u => { S.userMap[u.email] = u; });
}
async function loadProjects(force) {
  if (S.projects && !force) return S.projects;
  const r = await call('projects.list', S.showDeleted ? { daXoa: true } : {});
  S.projects = r.projects; S.projectsNote = r.note || '';
  return S.projects;
}
function upsertLocal(p) {
  if (!S.projects) return;
  const i = S.projects.findIndex(x => x.id === p.id);
  if (i >= 0) S.projects[i] = p; else S.projects.push(p);
}

/* ================= Khung trang ================= */
function navItems() {
  const P = S.perms, items = [{ h: '#/', l: 'Tổng quan', i: 'home' }];
  if (P.xemDuAn) items.push({ h: '#/du-an', l: 'Dự án', i: 'list' });
  if (P.xemDoiSoat) items.push({ h: '#/doi-soat', l: 'Đối soát', i: 'file' });
  if (P.xemKPI) items.push({ h: '#/kpi', l: 'KPI', i: 'target' });
  if (P.xemDuAn) items.push({ h: '#/bao-cao', l: 'Báo cáo', i: 'report' });
  if (P.import || P.quanTri) items.push({ h: '#/import', l: 'Import Excel', i: 'upload' });
  if (P.quanTri) items.push({ h: '#/quan-tri', l: 'Quản trị', i: 'gear' });
  return items;
}
function shell() {
  const me = S.me, items = navItems();
  $('#app').innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><div class="logo" role="img" aria-label="FPT Telecom"></div><div><b translate="no">TOOL IPC</b><small>Trung tâm đầu tư dự án</small></div></div>
      <nav class="nav" aria-label="Điều hướng chính">${items.map(x => `<a href="${x.h}">${ico(x.i)}<span>${x.l}</span></a>`).join('')}</nav>
      <div class="me"><b title="${esc(me.email)}">${esc(me.hoTen || me.email)}</b>${esc(ROLE_NAME[me.vaiTro] || me.vaiTro)}${me.phong && me.vaiTro !== 'BGD' ? ', ' + esc(me.phong) : ''}
        <br><button type="button" id="logout">Đăng xuất</button></div>
    </aside>
    <main class="main" id="main">
      <div class="mtop"><div class="logo" role="img" aria-label="FPT Telecom"></div><b translate="no">TOOL IPC</b><div class="who">${esc(me.hoTen || me.email)}<br><a href="#" id="logout2">Đăng xuất</a></div></div>
      <div id="view" tabindex="-1"></div>
    </main>
    <nav class="mnav" aria-label="Điều hướng">${(items.length > 5 ? items.slice(0, 4).concat([{ h: '#/menu', l: 'Thêm', i: 'menu' }]) : items).map(x => `<a href="${x.h}">${ico(x.i)}<span>${x.l}</span></a>`).join('')}</nav>
  </div>`;
  $('#logout').onclick = () => Auth.signOut();
  $('#logout2').onclick = e => { e.preventDefault(); Auth.signOut(); };
}
function markNav() {
  const h = location.hash || '#/';
  $$('.nav a, .mnav a').forEach(a => {
    const t = a.getAttribute('href'), on = t === '#/' ? (h === '#/' || h === '#' || h === '') : h.startsWith(t);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
const view = () => $('#view');
function loadingView() { view().innerHTML = `<div class="empty muted">Đang tải…</div>`; }
function errorView(e) { view().innerHTML = `<div class="panel"><div class="empty"><h3>Không tải được dữ liệu</h3><p>${esc(e.message)}</p><button class="btn" id="retry">Thử lại</button></div></div>`; $('#retry').onclick = () => route(); }

/* ================= Định tuyến ================= */
window.addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('hashchange', () => route());
let lastHash = location.hash;
async function route() {
  const h = location.hash || '#/';
  if (S.dirty && h !== lastHash) {
    if (!confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?')) { history.replaceState(null, '', lastHash || '#/'); return; }
    S.dirty = false;
  }
  lastHash = h;
  markNav(); window.scrollTo(0, 0);
  const [path, qs] = h.slice(1).split('?'), Q = new URLSearchParams(qs || '');
  const m = path.split('/').filter(Boolean);
  try {
    if (m[0] === 'du-an') {
      if (!m[1]) return await viewProjects(Q);
      if (m[1] === 'moi') return await viewForm(null);
      if (m[2] === 'sua') return await viewForm(decodeURIComponent(m[1]));
      return await viewDetail(decodeURIComponent(m[1]), Q);
    }
    if (m[0] === 'import') return viewImport();
    if (m[0] === 'doi-soat') {
      if (!m[1]) return await viewDsList(Q);
      if (m[1] === 'moi') return await viewDsForm(null, Q);
      if (m[2] === 'sua') return await viewDsForm(decodeURIComponent(m[1]), Q);
      return await viewDsDetail(decodeURIComponent(m[1]), Q);
    }
    if (m[0] === 'kpi') return await viewKPI(Q);
    if (m[0] === 'bao-cao') return await viewReport(Q);
    if (m[0] === 'menu') return viewMenu();
    if (!m.length) return await viewOverview(Q);
    if (m[0] === 'quan-tri') return await viewAdmin(m[1] || 'nhan-su');
    location.hash = '#/';
  } catch (e) {
    if (e.denied) return gate({ error: e.message });
    errorView(e);
  }
}

/* ================= Đường tiến độ ================= */
function railFrac(rl) { let last = -1; rl.forEach((n, i) => { if (n.st === 'xong' || n.st === 'xong_tre') last = i; }); return last <= 0 ? 0 : last / (rl.length - 1); }
function miniRail(p) {
  const rl = p._rail, title = rl.map(n => `${n.l}: ${ST_TEXT[n.st]}${n.d ? ' (' + vn(n.d) + ')' : ''}`).join('\n');
  return `<div class="rail" role="img" aria-label="${esc(title)}" title="${esc(title)}"><span class="seg" style="width:calc((100% - 12px) * ${railFrac(rl)})"></span>${rl.map(n => `<i class="${n.st}"></i>`).join('')}</div>`;
}
function bigTrack(p) {
  const rl = p._rail, frac = railFrac(rl);
  return `<div class="track"><span class="seg" style="width:calc(87.5% * ${frac})"></span>${rl.map(n => {
    let sub = n.d ? vn(n.d) : '—';
    if (n.st === 'qua_han' || n.st === 'sap_han' || n.st === 'dung_han') sub = 'Hạn ' + (n.han ? vn(n.han) : vn(n.d));
    if (n.st === 'qua_han' && n.k === 'bb') sub = 'Quá 7 ngày';
    return `<div class="stop ${n.st}"><div class="dot">${n.st === 'xong' || n.st === 'xong_tre' ? ico('check') : ''}</div><b>${esc(n.l)}</b><span>${esc(sub)}</span></div>`;
  }).join('')}</div>
  <div class="legend"><span><i style="background:var(--green);border-color:var(--green)"></i>Đã xong</span><span><i style="border-color:var(--blue)"></i>Đúng tiến độ</span><span><i style="background:var(--orange);border-color:var(--orange)"></i>Sắp đến hạn</span><span><i style="background:var(--red);border-color:var(--red)"></i>Quá hạn</span><span><i style="border-color:#C5CFDC"></i>Chưa đến bước</span></div>`;
}
function alertsOf(p) {
  const out = [], td = S.today, ht = p._rail.find(n => n.k === 'ht'), bb = p._rail.find(n => n.k === 'bb');
  p._ms.forEach(m => {
    if (m.st === 'qua_han') out.push(['err', `${m.l}: quá hạn ${IPC.daysBetween(m.han, td)} ngày (hạn ${vn(m.han)}).`]);
    else if (m.st === 'sap_han') out.push(['warn', `${m.l}: còn ${IPC.daysBetween(td, m.han)} ngày đến hạn (${vn(m.han)}).`]);
    if (m.note && !m.suaTay && m.st === 'cho') out.push(['info', `${m.l}: ${m.note}`]);
  });
  if (ht.cap === 3) out.push(['err', `Cảnh báo cấp III: đã quá ngày FPT dự kiến hoàn thiện hạ tầng ${IPC.daysBetween(p.ngayFPTDuKien, td)} ngày mà chưa hoàn thiện.`]);
  if (ht.cap === 2) out.push(['err', `Cảnh báo đỏ cấp II: còn ${IPC.daysBetween(td, p.ngayCDTYeuCau)} ngày đến hạn CĐT yêu cầu hoàn thiện hạ tầng (${vn(p.ngayCDTYeuCau)}).`]);
  if (ht.cap === 1) out.push(['warn', `Cảnh báo cấp I: còn ${IPC.daysBetween(td, p.ngayFPTDuKien)} ngày đến ngày FPT dự kiến hoàn thiện hạ tầng.`]);
  if (bb.st === 'qua_han') out.push(['err', 'Chưa hoàn tất thủ tục: đã quá 7 ngày từ ngày FPT hoàn thiện, bàn giao CN mà chưa có biên bản bàn giao.']);
  return out;
}
const healthTag = h => `<span class="tag ${h}">${HEALTH_TEXT[h]}</span>`;
const mainCode = p => p.maInside || p.id;

/* ================= Tổng quan ================= */
/* Tổng quan (dashboard): xem app-gd23.js */
// Tên dự án là link thật (Ctrl/Cmd+click, chuột giữa mở tab mới); bấm vào chỗ khác trên dòng cũng mở dự án
function rowHtml(p) {
  return `<tr class="click" data-id="${esc(p.id)}">
    <td class="code" translate="no">${esc(mainCode(p))}${p.maInside ? `<small>${esc(p.id)}</small>` : ''}</td>
    <td class="name"><a class="rowlink" href="#/du-an/${encodeURIComponent(p.id)}"><b>${esc(p.tenDuAn)}</b></a><span>${esc(p.diaChi)}</span></td>
    <td data-l="PM">${esc(p.tenPM)}</td>
    <td>${healthTag(p._health)}${p.khoa === 'Có' ? ' <span class="tag lock">Đã khóa</span>' : ''}<div class="small muted">${esc(p._stage)}</div></td>
    <td class="rail-cell">${miniRail(p)}</td></tr>`;
}
function bindRows() {
  $$('tr.click', view()).forEach(tr => {
    tr.onclick = e => {
      if (e.target.closest('a, button') || String(getSelection())) return;
      location.hash = '#/du-an/' + encodeURIComponent(tr.dataset.id);
    };
  });
}
// Đổi URL mà không tải lại trang (bộ lọc, tab nằm trên URL để chia sẻ/đánh dấu được)
function setHashQuery(path, obj) {
  const q = new URLSearchParams(); Object.keys(obj).forEach(k => { if (obj[k]) q.set(k, obj[k]); });
  const h = '#' + path + (q.toString() ? '?' + q : '');
  history.replaceState(null, '', h); lastHash = h;
}

/* ================= Danh sách dự án ================= */
const FILTER_KEYS = ['q', 'phong', 'pm', 'kv', 'cn', 'stage', 'health'];
async function viewProjects(Q) {
  loadingView();
  const ps = await loadProjects();
  const f = {}; FILTER_KEYS.forEach(k => { f[k] = (Q && Q.get(k)) || ''; }); S.filters = f;
  const P = S.perms;
  const pms = [...new Set(ps.map(p => p.emailPM))].map(e => ({ e, n: (S.userMap[e] || {}).hoTen || e })).sort((a, b) => a.n.localeCompare(b.n, 'vi'));
  const kvs = [...new Set(ps.map(p => p.khuVuc))].sort();
  const sel = (name, label, opts) => `<select class="in" data-f="${name}" aria-label="${label}"><option value="">${label}</option>${opts.map(o => `<option value="${esc(o.v)}"${f[name] === o.v ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
  view().innerHTML = `<div class="page-head"><div><h1>${S.showDeleted ? 'Dự án đã xóa' : 'Dự án'}</h1><p>${S.showDeleted ? 'Khôi phục hoặc xóa vĩnh viễn dự án đã xóa.' : 'Bấm vào một dự án để xem tiến độ và cập nhật.'}</p></div>
    <div class="actions">${P.bgd ? `<button class="btn" id="tgDel">${S.showDeleted ? 'Quay lại danh sách' : 'Xem dự án đã xóa'}</button>` : ''}
    ${P.taoDuAn && !S.showDeleted ? `<a class="btn primary" href="#/du-an/moi">${ico('plus')}Thêm dự án</a>` : ''}</div></div>
    <div class="panel">
      <div class="filters">
        <input class="in search" type="search" data-f="q" placeholder="Tìm theo tên, mã IPC, Mã Inside, CĐT, MST…" value="${esc(f.q)}" aria-label="Tìm dự án">
        ${P.bgd || P.tpVanHanh ? sel('phong', 'Tất cả phòng', IPC.PHONG_DAU_TU.map(x => ({ v: x, l: x }))) : ''}
        ${P.bgd || P.tpDauTu || P.tpVanHanh ? sel('pm', 'Tất cả PM', pms.map(x => ({ v: x.e, l: x.n }))) : ''}
        ${sel('kv', 'Tất cả khu vực', kvs.map(x => ({ v: x, l: x })))}
        ${sel('cn', 'Tất cả chi nhánh', [...new Set(ps.map(p => p.maCN))].sort().map(x => ({ v: x, l: x })))}
        ${sel('stage', 'Tất cả các bước', ['Mới tạo', 'Bước 1–2: Hồ sơ', 'Bước 3: Triển khai', 'Bước 4: Khai thác', 'Đã online'].map(x => ({ v: x, l: x })))}
        ${sel('health', 'Mọi tình trạng', [{ v: 'qua_han', l: 'Có mốc quá hạn' }, { v: 'sap_han', l: 'Có mốc sắp đến hạn' }, { v: 'on', l: 'Đúng tiến độ' }])}
        <span class="count" id="cnt"></span>
      </div>
      <div id="plist"></div>
    </div>`;
  const draw = () => {
    const q = f.q.trim().toLowerCase();
    const list = ps.filter(p => (!q || [p.tenDuAn, p.id, p.maInside, p.tenCDT, p.mstCDT, p.diaChi, p.tenDVHT, p.mstDVHT].join(' ').toLowerCase().includes(q))
      && (!f.phong || p.phong === f.phong) && (!f.pm || p.emailPM === f.pm) && (!f.kv || p.khuVuc === f.kv) && (!f.cn || p.maCN === f.cn)
      && (!f.stage || p._stage === f.stage) && (!f.health || p._health === f.health));
    $('#cnt').textContent = `${list.length}/${ps.length} dự án`;
    const box = $('#plist');
    if (!ps.length) {
      box.innerHTML = S.showDeleted ? `<div class="empty"><h3>Không có dự án nào đã xóa</h3></div>`
        : `<div class="empty"><h3>Chưa có dự án nào</h3><p>${P.taoDuAn ? 'Bấm <b>Thêm dự án</b> để nhập dự án đầu tiên' + (P.import ? ', hoặc nạp nhiều dự án từ biểu mẫu Excel ở mục <a href="#/import">Import Excel</a>' : '') + '.' : esc(S.projectsNote || 'Chưa có dự án trong phạm vi của bạn.')}</p></div>`;
      return;
    }
    if (!list.length) { box.innerHTML = `<div class="empty"><h3>Không có dự án khớp bộ lọc</h3><p>Đổi từ khóa hoặc bỏ bớt bộ lọc.</p></div>`; return; }
    list.sort((a, b) => ({ qua_han: 0, sap_han: 1, on: 2 }[a._health] - { qua_han: 0, sap_han: 1, on: 2 }[b._health]) || a.tenDuAn.localeCompare(b.tenDuAn, 'vi'));
    box.innerHTML = `<div class="tw"><table class="t cards"><thead><tr><th>Mã</th><th>Dự án</th><th>PM</th><th>Tình trạng</th><th>Tiến độ 8 mốc</th></tr></thead><tbody>${list.map(rowHtml).join('')}</tbody></table></div>`;
    bindRows();
  };
  $$('[data-f]', view()).forEach(el => { el.oninput = () => { f[el.dataset.f] = el.value; setHashQuery('/du-an', f); draw(); }; });
  const tg = $('#tgDel'); if (tg) tg.onclick = async () => { S.showDeleted = !S.showDeleted; S.projects = null; await viewProjects(); };
  draw();
}

/* ================= Chi tiết dự án ================= */
function fieldText(f, v) {
  if (v === '' || v === null || v === undefined) return '';
  if (f.t === 'date') return vn(v);
  if (f.t === 'pct') return IPC.pctText(v);
  if (f.t === 'int') return Number(v).toLocaleString('vi-VN');
  if (f.t === 'pm') return ((S.userMap[v] || {}).hoTen || v) + ' (' + v + ')';
  if (f.t === 'cn') { const c = S.cn.find(x => x.ma === v); return c ? `${v} – ${c.ten}` : v; }
  return v;
}
async function viewDetail(id, Q) {
  Q = Q || new URLSearchParams(location.hash.split('?')[1] || '');
  loadingView();
  const r = await call('project.get', { id }), p = r.project, P = S.perms;
  upsertLocal(p);
  const deleted = p.daXoa === 'Có', locked = p.khoa === 'Có';
  const canEdit = !deleted && P.sua && (!locked || P.khoa) && !P.tpVanHanh;
  const alerts = alertsOf(p);
  view().innerHTML = `<a class="back" href="#/du-an">${ico('back')}Danh sách dự án</a>
    ${deleted ? `<div class="alert err">Dự án này đã bị xóa${P.bgd ? '. Bạn có thể khôi phục hoặc xóa vĩnh viễn.' : '.'}</div>` : ''}
    <div class="detail-head"><div>
      <h1>${esc(p.tenDuAn)}</h1>
      <div class="codes"><span class="code" translate="no">${esc(mainCode(p))}</span>${p.maInside ? `<span class="muted">Mã hệ thống <span translate="no">${esc(p.id)}</span></span>` : '<span class="tag">Chưa có Mã Inside</span>'}
        ${healthTag(p._health)}<span class="tag">${esc(p._stage)}</span>${locked ? '<span class="tag lock">Đã khóa</span>' : ''}</div>
      <div class="codes">PM: ${esc(p.tenPM)}${p.phong ? ', ' + esc(p.phong) : ''} · ${esc(p.khuVuc)} · ${esc(p.maCN)}</div>
    </div><div class="actions">
      ${canEdit ? `<a class="btn primary" href="#/du-an/${encodeURIComponent(p.id)}/sua">${ico('edit')}Cập nhật</a>` : ''}
      ${!deleted && P.khoa ? `<button class="btn" id="bLock">${ico(locked ? 'unlock' : 'lock')}${locked ? 'Mở khóa' : 'Khóa dự án'}</button>` : ''}
      ${!deleted && P.xoa && (!locked || P.bgd) ? `<button class="btn danger" id="bDel">${ico('trash')}Xóa</button>` : ''}
      ${deleted && P.bgd ? `<button class="btn blue" id="bRes">Khôi phục</button><button class="btn danger" id="bPurge">Xóa vĩnh viễn</button>` : ''}
    </div></div>
    <div class="panel"><div class="panel-b">${bigTrack(p)}</div></div>
    ${alerts.length ? `<div style="margin-top:16px">${alerts.map(a => `<div class="alert ${a[0]}">${esc(a[1])}</div>`).join('')}</div>` : ''}
    <div class="tabs" role="tablist">
      <button role="tab" data-t="info" aria-selected="true">Thông tin</button>
      <button role="tab" data-t="han" aria-selected="false">Hạn các mốc</button>
      <button role="tab" data-t="files" aria-selected="false">File đính kèm</button>
      <button role="tab" data-t="hist" aria-selected="false">Lịch sử thay đổi (${r.history.length})</button>
    </div>
    <div id="tab"></div>`;
  const tabs = {
    info: () => IPC.GROUPS.map(g => `<div class="panel"><div class="panel-h"><h2>${g.l}</h2></div><div class="panel-b"><dl class="kv">${IPC.FIELDS.filter(f => f.g === g.g && f.k !== 'id').map(f => {
      const t = fieldText(f, p[f.k]);
      return `<div class="${f.wide ? 'wide' : ''}"><dt>${esc(f.l)}</dt><dd class="${t ? '' : 'none'}">${t ? esc(t) : 'Chưa nhập'}</dd></div>`;
    }).join('')}</dl></div></div>`).join('') + `<p class="note">Tạo ${esc(p.taoLuc.replace('T', ' '))} bởi ${esc(p.taoBoi)} · Sửa gần nhất ${esc(p.suaLuc.replace('T', ' '))} bởi ${esc(p.suaBoi)}</p>`,
    han: () => `<div class="panel"><div class="panel-h"><h2>Bước 1–2: hạn tính từ ngày khảo sát thực tế</h2></div><div class="tw"><table class="t ms-table"><thead><tr><th>Mốc</th><th>Số ngày làm việc</th><th>Hạn</th><th>Ngày đạt</th><th>Tình trạng</th>${P.suaHan ? '<th></th>' : ''}</tr></thead><tbody>
      ${p._ms.map(m => `<tr><td>${esc(m.l)}</td><td>${m.n || '—'}</td><td>${m.han ? vn(m.han) : '—'}${m.suaTay ? ' <span class="tag sap_han">Sửa tay</span>' : ''}</td><td>${m.xong ? vn(m.xong) : '—'}</td>
        <td><span class="tag ${m.st}">${ST_TEXT[m.st]}</span>${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}</td>
        ${P.suaHan ? `<td><button class="btn ghost" data-han="${m.k}">Sửa hạn</button></td>` : ''}</tr>`).join('')}
      </tbody></table></div>
      <div class="panel-b note">Ngày khảo sát thực tế: ${p.ngayKhaoSat ? vn(p.ngayKhaoSat) : 'chưa nhập'}. Ngày làm việc không tính thứ 7, chủ nhật và ngày nghỉ lễ trong danh mục Ngày lễ. Cảnh báo trước hạn ${S.cfg.canhBaoTruoc} ngày.</div></div>`,
    hist: () => r.history.length ? `<div class="panel"><div class="panel-b hist">${r.history.map(h => `<div class="h"><time>${esc(String(h.luc).replace('T', ' '))}</time><div><b>${esc(h.hanhDong)}</b> · ${esc(h.email)}${h.truong ? `<div class="chg">${esc(h.truong)}: <s>${esc(h.cu || '(trống)')}</s> → ${esc(h.moi || '(trống)')}</div>` : ''}${h.ghiChu ? `<div class="note">${esc(h.ghiChu)}</div>` : ''}</div></div>`).join('')}</div></div>` : `<div class="panel"><div class="empty">Chưa có thay đổi nào.</div></div>`,
    files: () => ''
  };
  const show = (t, sync) => {
    $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    $('#tab').innerHTML = tabs[t]();
    if (t === 'files') attachPanel($('#tab'), 'du_an', p.id);
    $$('[data-han]').forEach(b => b.onclick = () => editDeadline(p, b.dataset.han));
    if (sync) setHashQuery('/du-an/' + encodeURIComponent(p.id), { tab: t === 'info' ? '' : t });
  };
  $$('.tabs button').forEach(b => b.onclick = () => show(b.dataset.t, true));
  show(tabs[Q.get('tab')] ? Q.get('tab') : 'info');
  linkDsFor(p);
  const act = async (fn, ok) => { try { await fn(); toast(ok); } catch (e) { toast(e.message, true); } };
  const bLock = $('#bLock'); if (bLock) bLock.onclick = () => act(async () => { const x = await call('project.lock', { id: p.id, lock: !locked }); upsertLocal(x.project); await viewDetail(p.id); }, locked ? 'Đã mở khóa dự án' : 'Đã khóa dự án');
  const bDel = $('#bDel'); if (bDel) bDel.onclick = async () => {
    const lyDo = await dialog({ title: 'Xóa dự án', body: `<p>Xóa <b>${esc(p.tenDuAn)}</b>? Dự án sẽ ẩn khỏi danh sách. Giám đốc trung tâm có thể khôi phục.</p><label class="f">Lý do xóa<input class="in" id="lyDo"></label>`, buttons: [{ l: 'Hủy', v: null }, { l: 'Xóa dự án', cls: 'danger', v: d => $('#lyDo', d).value }] });
    if (lyDo === null) return;
    act(async () => { await call('project.delete', { id: p.id, lyDo }); S.projects = null; location.hash = '#/du-an'; }, 'Đã xóa dự án');
  };
  const bRes = $('#bRes'); if (bRes) bRes.onclick = () => act(async () => { await call('project.restore', { id: p.id }); S.projects = null; await viewDetail(p.id); }, 'Đã khôi phục dự án');
  const bPurge = $('#bPurge'); if (bPurge) bPurge.onclick = async () => {
    if (!await confirmDlg('Xóa vĩnh viễn', `Xóa vĩnh viễn <b>${esc(p.tenDuAn)}</b> khỏi cơ sở dữ liệu? Không khôi phục được. Nhật ký thay đổi vẫn được giữ.`, 'Xóa vĩnh viễn', 'danger')) return;
    act(async () => { await call('project.purge', { id: p.id }); S.projects = null; location.hash = '#/du-an'; }, 'Đã xóa vĩnh viễn');
  };
}
async function editDeadline(p, key) {
  const m = p._ms.find(x => x.k === key);
  const res = await dialog({
    title: 'Sửa hạn: ' + m.l,
    body: `<p class="muted">Hạn tự tính: ${m.n && p.ngayKhaoSat ? vn(IPC.addWorkdays(p.ngayKhaoSat, m.n, S.hol)) : 'chưa tính được'}. Sửa tay sẽ ghi vào nhật ký.</p>
      <div class="grid-f"><label class="f">Hạn mới<input class="in" type="date" id="dv" value="${esc(m.suaTay ? m.han : '')}"></label>
      <label class="f wide">Lý do<input class="in" id="dl" placeholder="VD: CĐT lùi lịch thẩm định…" autocomplete="off"></label></div>`,
    buttons: [{ l: 'Hủy', v: null }].concat(m.suaTay ? [{ l: 'Bỏ sửa tay', v: { value: '' } }] : []).concat([{ l: 'Lưu hạn', cls: 'primary', v: d => ({ value: $('#dv', d).value, lyDo: $('#dl', d).value }) }])
  });
  if (!res) return;
  try { const r = await call('project.deadline', Object.assign({ id: p.id, key }, res)); upsertLocal(r.project); toast('Đã lưu hạn'); await viewDetail(p.id); }
  catch (e) { toast(e.message, true); }
}

/* ================= Biểu mẫu dự án ================= */
function pmOptions(current) {
  const P = S.perms, me = S.me;
  let list = S.users.filter(u => ['PM', 'TP'].includes(u.vaiTro) && IPC.PHONG_DAU_TU.includes(u.phong) && u.trangThai !== 'Đã nghỉ');
  if (P.tpDauTu) list = list.filter(u => u.phong === me.phong);
  else if (!P.bgd) list = list.filter(u => u.email === me.email);
  if (current && !list.some(u => u.email === current) && S.userMap[current]) list.push(S.userMap[current]);
  return list.sort((a, b) => (a.hoTen || '').localeCompare(b.hoTen || '', 'vi'));
}
function inputHtml(f, v, p) {
  const id = 'f_' + f.k, P = S.perms;
  let ctl;
  const val = v === null || v === undefined ? '' : v;
  if (f.t === 'date') ctl = `<input class="in" type="date" id="${id}" name="${f.k}" value="${esc(val)}">`;
  else if (f.t === 'int') ctl = `<input class="in" inputmode="numeric" id="${id}" name="${f.k}" value="${esc(val)}" autocomplete="off">`;
  else if (f.t === 'pct') ctl = `<input class="in" inputmode="decimal" id="${id}" name="${f.k}" value="${esc(val === '' ? '' : IPC.pctText(val))}" placeholder="VD: 25%…" autocomplete="off">`;
  else if (f.t === 'list') {
    const dis = f.k === 'trangThaiHD' && !P.suaTrangThaiHD;
    ctl = `<select class="in" id="${id}" name="${f.k}"${dis ? ' disabled' : ''}><option value="">— Chọn —</option>${IPC.LISTS[f.o].map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else if (f.t === 'pm') {
    const opts = pmOptions(val);
    const fixed = !P.bgd && !P.tpDauTu;
    ctl = `<select class="in" id="${id}" name="${f.k}"${fixed ? ' disabled' : ''}>${opts.length > 1 || !val ? '<option value="">— Chọn PM —</option>' : ''}${opts.map(u => `<option value="${esc(u.email)}"${u.email === val ? ' selected' : ''}>${esc(u.hoTen || u.email)} (${esc(u.phong)})</option>`).join('')}</select>`;
  } else if (f.t === 'kv') ctl = `<select class="in" id="${id}" name="${f.k}"><option value="">— Chọn khu vực —</option>${S.kv.map(k => `<option value="${esc(k.ma)}"${k.ma === val ? ' selected' : ''}>${esc(k.ma)}${k.ten ? ' – ' + esc(k.ten) : ''}</option>`).join('')}</select>`;
  else if (f.t === 'cn') ctl = `<select class="in" id="${id}" name="${f.k}"><option value="">— Chọn chi nhánh —</option>${S.cn.map(c => `<option value="${esc(c.ma)}" data-kv="${esc(c.khuVuc)}"${c.ma === val ? ' selected' : ''}>${esc(c.ma)} – ${esc(c.ten)}</option>`).join('')}</select>`;
  else if (f.t === 'mst') ctl = `<div class="row"><input class="in" id="${id}" name="${f.k}" value="${esc(val)}" inputmode="numeric" placeholder="10 số hoặc 10 số-3 số…" autocomplete="off" spellcheck="false"><a class="btn ghost" href="https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp" target="_blank" rel="noopener noreferrer" title="Tra cứu MST trên trang của Tổng cục Thuế">Tra cứu</a></div>`;
  else if (f.k === 'ghiChu') ctl = `<textarea class="in" id="${id}" name="${f.k}" autocomplete="off">${esc(val)}</textarea>`;
  else ctl = `<input class="in" id="${id}" name="${f.k}" value="${esc(val)}" autocomplete="off"${f.k === 'maInside' ? ' spellcheck="false"' : ''}>`;
  return `<label class="f${f.wide ? ' wide' : ''}" data-k="${f.k}" for="${id}"><span>${esc(f.l)}${f.req ? ' <span class="req" aria-label="bắt buộc">*</span>' : ''}</span>${ctl}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}<span class="msg" aria-live="polite"></span></label>`;
}
async function viewForm(id) {
  loadingView();
  const P = S.perms;
  let p = null;
  if (id) {
    p = (await call('project.get', { id })).project;
    if (!P.sua || P.tpVanHanh || p.daXoa === 'Có' || (p.khoa === 'Có' && !P.khoa)) { toast('Bạn không sửa được dự án này.', true); location.hash = '#/du-an/' + encodeURIComponent(id); return; }
  } else if (!P.taoDuAn) { location.hash = '#/du-an'; return; }
  await loadProjects();
  const init = p ? Object.assign({}, p) : { emailPM: P.bgd || P.tpDauTu ? '' : S.me.email };
  const missingCat = !S.kv.length || !S.cn.length;
  view().innerHTML = `<a class="back" href="${p ? '#/du-an/' + encodeURIComponent(p.id) : '#/du-an'}">${ico('back')}${p ? 'Quay lại dự án' : 'Danh sách dự án'}</a>
    <div class="page-head"><div><h1>${p ? 'Cập nhật dự án' : 'Thêm dự án'}</h1><p>${p ? esc(p.tenDuAn) + ' · ' + esc(mainCode(p)) : 'Mã hệ thống được tạo tự động khi lưu.'}</p></div></div>
    ${missingCat ? `<div class="alert warn">Danh mục ${!S.kv.length ? 'khu vực' : ''}${!S.kv.length && !S.cn.length ? ' và ' : ''}${!S.cn.length ? 'chi nhánh' : ''} đang trống nên chưa lưu được dự án. ${P.quanTri ? 'Nhập danh mục ở mục <a href="#/quan-tri/danh-muc">Quản trị</a>.' : 'Báo Giám đốc trung tâm bổ sung danh mục.'}</div>` : ''}
    <div id="formAlert"></div>
    <form id="pf" novalidate>
      ${IPC.GROUPS.map(g => `<div class="panel form-sec"><div class="panel-h"><h2>${g.l}</h2></div><div class="panel-b grid-f">${IPC.FIELDS.filter(f => f.g === g.g && f.k !== 'id').map(f => inputHtml(f, init[f.k], p)).join('')}</div></div>`).join('')}
      <div class="form-bar"><a class="btn" href="${p ? '#/du-an/' + encodeURIComponent(p.id) : '#/du-an'}">Hủy</a><button class="btn primary" type="submit">${ico('check')}${p ? 'Lưu thay đổi' : 'Lưu dự án'}</button></div>
    </form>`;
  const form = $('#pf');
  let tried = false;
  const focusFirstError = () => { const el = $('label.f.has-err .in', form); if (el) el.focus(); else $('#formAlert').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const read = () => {
    const o = p ? { id: p.id } : {};
    IPC.FIELDS.forEach(f => { if (f.k === 'id') return; const el = form.elements[f.k]; if (el) o[f.k] = el.value; });
    if (p && !P.suaTrangThaiHD) o.trangThaiHD = p.trangThaiHD;
    return o;
  };
  const mark = (errors, warnings) => {
    $$('label.f', form).forEach(l => { l.classList.remove('has-err', 'has-warn'); $('.msg', l).textContent = ''; });
    (warnings || []).forEach(w => { const l = $(`label.f[data-k="${w.k}"]`, form); if (l) { l.classList.add('has-warn'); $('.msg', l).textContent = w.m; } });
    (errors || []).forEach(e => { const l = $(`label.f[data-k="${e.k}"]`, form); if (l) { l.classList.remove('has-warn'); l.classList.add('has-err'); $('.msg', l).textContent = e.m; } });
  };
  const localCheck = () => {
    const n = IPC.normalizeProject(read()), users = {}, kv = {}, cn = {};
    S.users.forEach(u => { users[u.email] = u; }); S.kv.forEach(k => { kv[k.ma] = k; }); S.cn.forEach(c => { cn[c.ma] = c; });
    const others = (S.projects || []).filter(x => !p || x.id !== p.id);
    return IPC.validateProject(n.p, { old: p, others, users, kv, cn, cfg: S.cfg, today: S.today, bad: n.bad });
  };
  form.addEventListener('input', () => { S.dirty = true; if (tried) { const v = localCheck(); mark(v.errors, []); } });
  // Chọn chi nhánh → tự điền khu vực
  const cnSel = form.elements.maCN, kvSel = form.elements.khuVuc;
  cnSel.addEventListener('change', () => { const o = cnSel.selectedOptions[0]; if (o && o.dataset.kv && !kvSel.value) kvSel.value = o.dataset.kv; });
  form.onsubmit = async e => {
    e.preventDefault(); tried = true;
    const v = localCheck(), box = $('#formAlert');
    mark(v.errors, v.warnings);
    if (v.errors.length) {
      box.innerHTML = `<div class="alert err"><b>Chưa lưu được — còn ${v.errors.length} lỗi:</b><ul>${v.errors.slice(0, 8).map(x => `<li>${esc(x.m)}</li>`).join('')}</ul></div>`;
      focusFirstError(); return;
    }
    box.innerHTML = '';
    const btn = $('button[type=submit]', form), btnHtml = btn.innerHTML; btn.disabled = true; btn.textContent = 'Đang lưu…';
    try {
      let r = await api('project.save', { project: read() });
      if (r.ok && r.needConfirm) {
        mark([], r.warnings);
        const go = await dialog({ title: 'Kiểm tra cảnh báo trước khi lưu', body: `<p>Dữ liệu có ${r.warnings.length} cảnh báo:</p><ul>${r.warnings.map(w => `<li>${esc(w.m)}</li>`).join('')}</ul><p class="muted">Bấm <b>Vẫn lưu</b> nếu số liệu đúng. Cảnh báo được ghi vào nhật ký.</p>`, buttons: [{ l: 'Quay lại sửa', v: false }, { l: 'Vẫn lưu', v: true, cls: 'primary' }] });
        if (!go) return;
        r = await api('project.save', { project: read(), confirm: true });
      }
      if (!r.ok) { mark(r.errors || [], r.warnings || []); box.innerHTML = `<div class="alert err">${esc(r.error)}</div>`; focusFirstError(); return; }
      S.dirty = false; upsertLocal(r.project);
      toast(r.action === 'Tạo mới' ? 'Đã lưu dự án ' + r.project.id : r.action === 'Không đổi' ? 'Không có thay đổi nào' : 'Đã lưu thay đổi');
      location.hash = '#/du-an/' + encodeURIComponent(r.project.id);
    } catch (err) { toast(err.message, true); }
    finally { btn.disabled = false; btn.innerHTML = btnHtml; }
  };
}

/* ================= Import Excel ================= */
const IMPORT_SHEETS = [
  { s: 'DM_KhuVuc', l: 'Khu vực', admin: true }, { s: 'DM_ChiNhanh', l: 'Chi nhánh', admin: true },
  { s: 'NhanSu', l: 'Nhân sự', admin: true }, { s: 'NgayLe', l: 'Ngày lễ', admin: true },
  { s: 'CauHinh', l: 'Cấu hình', admin: true }, { s: 'DuAn', l: 'Dự án', need: 'import' }, { s: 'DoiSoat', l: 'Đối soát', need: 'taoDoiSoat' }
];
const IMP = { file: '', sheets: {}, cur: '', res: null };
function viewImport() {
  const P = S.perms;
  if (!P.import && !P.quanTri) { location.hash = '#/'; return; }
  view().innerHTML = `<div class="page-head"><div><h1>Import Excel</h1><p>Nạp dữ liệu từ biểu mẫu. Hệ thống kiểm tra từng dòng trước khi ghi.</p></div>
    <div class="actions"><a class="btn" href="assets/bieu-mau-import.xlsx" download="BIEU_MAU_IMPORT_TOOL_IPC.xlsx">${ico('down')}Tải biểu mẫu</a></div></div>
    <div class="panel"><div class="panel-b">
      <ol class="steps"><li>Tải biểu mẫu, điền từ dòng 3 (dòng 2 là hướng dẫn, giữ nguyên).</li>
      ${P.quanTri ? '<li>Nạp theo thứ tự: Khu vực → Chi nhánh → Nhân sự → Ngày lễ → Cấu hình → Dự án → Đối soát.</li>' : `<li>Bạn được import ${P.taoDoiSoat ? 'sheet Đối soát (hồ sơ đang đối soát)' : 'sheet Dự án, trong phạm vi dự án của mình'}.</li>`}
      <li>Chọn sheet, bấm <b>Kiểm tra</b>, xem lỗi từng dòng, rồi bấm <b>Ghi dữ liệu</b>. Dòng có lỗi không được ghi.</li></ol>
      <div class="drop" id="drop" style="margin-top:14px"><p>Kéo file Excel vào đây, hoặc</p><label class="btn blue">Chọn file .xlsx<input type="file" id="file" accept=".xlsx,.xls" hidden></label><p class="muted small" id="fname">${IMP.file ? esc(IMP.file) : 'Chưa chọn file'}</p></div>
    </div></div>
    <div id="impBody"></div>`;
  const drop = $('#drop'), inp = $('#file');
  inp.onchange = () => inp.files[0] && readFile(inp.files[0]);
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) readFile(f); });
  if (IMP.file) drawImport();
}
async function readFile(file) {
  if (!window.XLSX) { toast('Thư viện đọc Excel chưa tải xong, thử lại sau vài giây.', true); return; }
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    IMP.file = file.name; IMP.sheets = {}; IMP.res = null;
    const allowed = IMPORT_SHEETS.filter(x => S.perms.quanTri || (!x.admin && S.perms.import && (!x.need || S.perms[x.need])));
    allowed.forEach(x => {
      const ws = wb.Sheets[x.s]; if (!ws) return;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
      const head = (rows[0] || []).map(h => String(h).trim()), start = x.s === 'CauHinh' ? 1 : 2, out = [];
      for (let i = start; i < rows.length; i++) {
        const r = rows[i]; if (!r.some(v => String(v).trim() !== '')) continue;
        const o = { __row: i + 1 }; head.forEach((h, j) => { if (h) o[h] = r[j]; }); out.push(o);
      }
      if (out.length) IMP.sheets[x.s] = out;
    });
    const keys = Object.keys(IMP.sheets);
    IMP.cur = keys.includes(IMP.cur) ? IMP.cur : keys[0] || '';
    $('#fname').textContent = file.name;
    if (!keys.length) toast('File không có dữ liệu ở các sheet bạn được import (' + allowed.map(x => x.s).join(', ') + ').', true);
    drawImport();
  } catch (e) { toast('Không đọc được file: ' + e.message, true); }
}
function drawImport() {
  const box = $('#impBody'); if (!box) return;
  const keys = Object.keys(IMP.sheets);
  if (!keys.length) { box.innerHTML = ''; return; }
  const meta = IMPORT_SHEETS.find(x => x.s === IMP.cur), rows = IMP.sheets[IMP.cur], res = IMP.res;
  const nErr = res ? res.filter(r => r.errors.length).length : 0, nWarn = res ? res.filter(r => !r.errors.length && r.warnings.length).length : 0;
  const committed = res && res.some(r => r.saved);
  box.innerHTML = `<div class="panel" style="margin-top:16px"><div class="panel-b">
    <div class="sheet-tabs">${keys.map(k => `<button type="button" data-s="${k}" aria-pressed="${k === IMP.cur}">${esc(IMPORT_SHEETS.find(x => x.s === k).l)} <em>${IMP.sheets[k].length} dòng</em></button>`).join('')}</div>
    <div class="actions"><button class="btn blue" id="bCheck">Kiểm tra ${rows.length} dòng ${esc(meta.l.toLowerCase())}</button>
    ${res && !committed ? `<button class="btn primary" id="bCommit"${res.length - nErr ? '' : ' disabled'}>Ghi dữ liệu (${res.length - nErr} dòng hợp lệ)</button>` : ''}</div>
    ${res && !committed && nWarn ? `<label class="f" style="margin-top:12px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="cfWarn"> Tôi đã xem ${nWarn} dòng có cảnh báo và vẫn muốn ghi các dòng đó</label>` : ''}
    ${res ? `<p class="small" style="margin:12px 0 0">${committed ? `<span class="res-ok">Đã ghi ${res.filter(r => r.saved).length}/${res.length} dòng.</span>` : `Hợp lệ ${res.length - nErr - nWarn} · Có cảnh báo ${nWarn} · Có lỗi ${nErr}`}</p>` : ''}
  </div>
  ${res ? `<div class="tw"><table class="t res"><thead><tr><th>Dòng</th><th>Bản ghi</th><th>Thao tác</th><th>Kết quả</th></tr></thead><tbody>${res.map(r => `<tr>
    <td>${r.row}</td><td>${esc(r.ten || r.id || '')}</td><td>${esc(r.saved ? r.action : (r.action || ''))}</td>
    <td>${r.errors.length ? `<ul class="res-err">${r.errors.map(e => `<li>${esc(e.m)}</li>`).join('')}</ul>` : ''}${r.warnings.length ? `<ul class="res-warn">${r.warnings.map(e => `<li>${esc(e.m)}</li>`).join('')}</ul>` : ''}${!r.errors.length && !r.warnings.length ? `<span class="res-ok">${r.saved ? 'Đã ghi' : 'Hợp lệ'}</span>` : r.saved ? '<span class="res-ok">Đã ghi</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </div>`;
  $$('[data-s]', box).forEach(b => b.onclick = () => { IMP.cur = b.dataset.s; IMP.res = null; drawImport(); });
  $('#bCheck').onclick = () => runImport(false);
  const bc = $('#bCommit'); if (bc) bc.onclick = () => runImport(true);
}
async function runImport(commit) {
  const confirmW = !!($('#cfWarn') && $('#cfWarn').checked);
  const btns = $$('#impBody .btn'); btns.forEach(b => b.disabled = true);
  try {
    const r = await call('import.run', { sheet: IMP.cur, rows: IMP.sheets[IMP.cur], commit, confirm: confirmW });
    // máy chủ đánh số dòng theo thứ tự gửi; đổi về số dòng thật trong Excel
    r.results.forEach((x, i) => { x.row = IMP.sheets[IMP.cur][i] ? IMP.sheets[IMP.cur][i].__row : x.row; });
    IMP.res = r.results;
    if (commit) {
      toast('Đã ghi ' + r.results.filter(x => x.saved).length + ' dòng');
      S.projects = null; setInit(await call('init'));
    }
  } catch (e) { toast(e.message, true); }
  drawImport();
}

/* ================= Quản trị ================= */
const ADMIN_TABS = [['nhan-su', 'Nhân sự'], ['danh-muc', 'Danh mục'], ['ngay-le', 'Ngày lễ'], ['cau-hinh', 'Cấu hình'], ['email', 'Email & lịch gửi'], ['nhat-ky', 'Nhật ký']];
async function viewAdmin(tab) {
  if (!S.perms.quanTri) { location.hash = '#/'; return; }
  loadingView();
  const A = await call('admin.get');
  view().innerHTML = `<div class="page-head"><div><h1>Quản trị</h1><p>Người dùng, phân quyền, danh mục và cấu hình. Mọi thay đổi được ghi nhật ký.</p></div></div>
    <nav class="tabs" aria-label="Mục quản trị">${ADMIN_TABS.map(t => `<a href="#/quan-tri/${t[0]}"${t[0] === tab ? ' aria-current="page"' : ''}>${t[1]}</a>`).join('')}</nav><div id="adm"></div>`;
  const box = $('#adm');
  if (tab === 'nhan-su') adminUsers(box, A);
  else if (tab === 'danh-muc') {
    box.innerHTML = `<div id="g1"></div><div id="g2" style="margin-top:16px"></div>`;
    gridEditor($('#g1'), 'Khu vực', 'kv', [['ma', 'Mã khu vực'], ['ten', 'Tên khu vực']], A.kv);
    gridEditor($('#g2'), 'Chi nhánh', 'cn', [['ma', 'Mã CN'], ['ten', 'Tên chi nhánh'], ['khuVuc', 'Mã khu vực', A.kv.map(k => k.ma)]], A.cn);
  } else if (tab === 'ngay-le') gridEditor(box, 'Ngày nghỉ lễ, nghỉ bù', 'holidays', [['ngay', 'Ngày', 'date'], ['ten', 'Tên ngày lễ']], A.holidays.map(h => ({ ngay: IPC.normDate(h.ngay) || h.ngay, ten: h.ten })), 'Không tính là ngày làm việc khi tính hạn các mốc. Thứ 7 và chủ nhật đã tự loại trừ.');
  else if (tab === 'cau-hinh') adminConfig(box, A);
  else if (tab === 'nhat-ky') adminLog(box);
  else if (tab === 'email') adminJobs(box);
}
function adminUsers(box, A) {
  const yes = v => v === 'Có' ? 'Có' : v === 'Không' ? 'Không' : '';
  box.innerHTML = `<div class="panel"><div class="panel-h"><h2>Nhân sự (${A.users.length})</h2><button class="btn primary" id="addU">${ico('plus')}Thêm nhân sự</button></div>
    <div class="tw"><table class="t"><thead><tr><th>Email</th><th>Họ tên</th><th>Vai trò</th><th>Phòng</th><th>Trạng thái</th><th>Import</th><th>Sửa</th><th>Xóa</th><th>Xuất BC</th></tr></thead><tbody>
    ${A.users.map(u => `<tr><td><button type="button" class="linkbtn" data-e="${esc(u.email)}" aria-label="Sửa nhân sự ${esc(u.email)}">${esc(u.email)}</button>${String(u.email).toLowerCase() === String(A.owner).toLowerCase() ? ' <span class="tag xong">Chủ web</span>' : ''}</td><td>${esc(u.hoTen)}</td><td>${esc(u.vaiTro)}</td><td>${esc(u.phong)}</td>
      <td><span class="tag ${u.trangThai === 'Đã nghỉ' ? 'lock' : 'xong'}">${esc(u.trangThai)}</span></td><td>${yes(u.qImport)}</td><td>${yes(u.qSua)}</td><td>${yes(u.qXoa)}</td><td>${yes(u.qXuat)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="panel-b note">Ô quyền để trống = theo vai trò: PM/TP được sửa dự án trong phạm vi; import, xóa, xuất báo cáo phải được cấp "Có". BGD luôn có toàn quyền.</div></div>`;
  const open = u => userDialog(u, A);
  $('#addU').onclick = () => open(null);
  $$('[data-e]', box).forEach(b => { b.onclick = () => open(A.users.find(u => u.email === b.dataset.e)); });
}
async function userDialog(u, A) {
  const v = u || { trangThai: 'Đang làm việc' };
  const sel = (n, list, cur, blank) => `<select class="in" name="${n}">${blank !== undefined ? `<option value="">${blank}</option>` : ''}${list.map(o => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const res = await dialog({
    title: u ? 'Sửa nhân sự' : 'Thêm nhân sự',
    onOpen: d => { $('#uf', d).onsubmit = e => e.preventDefault(); },
    body: `<form class="grid-f" id="uf">
      <label class="f wide">Email Google<input class="in" name="email" type="email" autocomplete="off" spellcheck="false" value="${esc(v.email || '')}"${u ? ' readonly' : ''} required></label>
      <label class="f wide">Họ tên<input class="in" name="hoTen" autocomplete="off" value="${esc(v.hoTen || '')}" required></label>
      <label class="f">Vai trò${sel('vaiTro', IPC.LISTS.vaiTro, v.vaiTro, '— Chọn —')}</label>
      <label class="f">Phòng${sel('phong', IPC.LISTS.phong, v.phong, '— Chọn —')}</label>
      <label class="f">Trạng thái${sel('trangThai', IPC.LISTS.trangThaiNS, v.trangThai)}</label>
      <label class="f">KPI port ký HĐHT/tháng<input class="in" name="kpiHDHT" inputmode="numeric" value="${esc(v.kpiHDHT || '')}" placeholder="Mặc định ${S.cfg.kpiPortHDHT}…" autocomplete="off"></label>
      <label class="f">KPI port online/tháng<input class="in" name="kpiOnline" inputmode="numeric" value="${esc(v.kpiOnline || '')}" placeholder="Mặc định ${S.cfg.kpiPortOnline}…" autocomplete="off"></label>
      <label class="f">Quyền import${sel('qImport', ['Có', 'Không'], v.qImport, 'Theo vai trò')}</label>
      <label class="f">Quyền sửa${sel('qSua', ['Có', 'Không'], v.qSua, 'Theo vai trò')}</label>
      <label class="f">Quyền xóa${sel('qXoa', ['Có', 'Không'], v.qXoa, 'Theo vai trò')}</label>
      <label class="f">Quyền xuất báo cáo${sel('qXuat', ['Có', 'Không'], v.qXuat, 'Theo vai trò')}</label>
      <label class="f wide">Khu vực/CN phụ trách (CBDS)<input class="in" name="phuTrach" value="${esc(v.phuTrach || '')}" placeholder="Nhiều mã cách nhau dấu phẩy, VD: HNI, QNH…" autocomplete="off" spellcheck="false"></label>
    </form><div id="uerr"></div>`,
    buttons: [{ l: 'Hủy', v: null }, {
      l: 'Lưu nhân sự', cls: 'primary', check: async d => {
        const f = $('#uf', d), o = {}; ['email', 'hoTen', 'vaiTro', 'phong', 'trangThai', 'kpiHDHT', 'kpiOnline', 'qImport', 'qSua', 'qXoa', 'qXuat', 'phuTrach'].forEach(k => { o[k] = f.elements[k].value.trim(); });
        try { await call('admin.saveUser', { user: o, isNew: !u }); return true; }
        catch (e) { $('#uerr', d).innerHTML = `<div class="alert err" style="margin-top:12px">${esc(e.message)}</div>`; return false; }
      }, v: true
    }]
  });
  if (res) { toast('Đã lưu nhân sự'); setInit(await call('init')); viewAdmin('nhan-su'); }
}
function gridEditor(box, title, table, cols, rows, note) {
  let data = rows.map(r => Object.assign({}, r));
  const draw = () => {
    box.innerHTML = `<div class="panel"><div class="panel-h"><h2>${esc(title)} (${data.length})</h2><div class="actions"><button class="btn" data-add>${ico('plus')}Thêm dòng</button><button class="btn primary" data-save>Lưu ${esc(title.toLowerCase())}</button></div></div>
      ${note ? `<div class="panel-b note" style="padding-bottom:0">${esc(note)}</div>` : ''}
      <div class="tw"><table class="t grid-edit"><thead><tr>${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}<th></th></tr></thead><tbody>
      ${data.map((r, i) => `<tr>${cols.map(c => `<td>${Array.isArray(c[2]) ? `<select class="in" data-i="${i}" data-c="${c[0]}"><option value=""></option>${c[2].map(o => `<option${o === r[c[0]] ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input class="in" ${c[2] === 'date' ? 'type="date"' : ''} data-i="${i}" data-c="${c[0]}" value="${esc(r[c[0]] || '')}" autocomplete="off" spellcheck="false" aria-label="${esc(c[1])}">`}</td>`).join('')}
        <td><button class="btn ghost" data-del="${i}" aria-label="Xóa dòng">${ico('trash')}</button></td></tr>`).join('')}
      ${data.length ? '' : `<tr><td colspan="${cols.length + 1}" class="empty">Chưa có dữ liệu. Bấm Thêm dòng hoặc import từ biểu mẫu.</td></tr>`}
      </tbody></table></div></div>`;
    $$('[data-i]', box).forEach(el => el.oninput = () => { data[+el.dataset.i][el.dataset.c] = el.value; S.dirty = true; });
    $$('[data-del]', box).forEach(b => b.onclick = () => { data.splice(+b.dataset.del, 1); S.dirty = true; draw(); });
    $('[data-add]', box).onclick = () => { data.push({}); draw(); const l = $$('[data-i]', box); if (l.length) l[l.length - cols.length].focus(); };
    $('[data-save]', box).onclick = async () => {
      try { await call('admin.saveTable', { table, rows: data }); S.dirty = false; toast('Đã lưu ' + title.toLowerCase()); setInit(await call('init')); }
      catch (e) { toast(e.message, true); }
    };
  };
  draw();
}
function adminConfig(box, A) {
  box.innerHTML = `<form class="panel" id="cf"><div class="panel-h"><h2>Cấu hình</h2><button class="btn primary">Lưu cấu hình</button></div><div class="panel-b grid-f">
    ${A.config.map(c => `<label class="f">${esc(c.l)}${c.t === 'list' ? `<select class="in" name="${c.k}"><option value="">— Chưa chọn —</option>${IPC.LISTS[c.o].map(o => `<option${o === c.v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : `<input class="in" name="${c.k}" value="${esc(c.t === 'pct' && c.v !== '' ? IPC.pctText(c.v) : c.v)}"${c.t === 'int' ? ' inputmode="numeric"' : ''}>`}${c.v === '' ? '<span class="hint" style="color:var(--orange-ink)">Cần cung cấp</span>' : ''}</label>`).join('')}
    </div><div class="panel-b note">Số ngày, ngưỡng cảnh báo và KPI mặc định lấy theo file TOOL IPC.xlsx. Đổi số ngày làm hạn của mọi dự án được tính lại (trừ hạn đã sửa tay). "Lịch báo cáo tuần" nhập dạng Thứ 5, 15:00 (Thứ 2 → Thứ 7 hoặc Chủ nhật, giờ chẵn); lưu xong hệ thống tự cài lại lịch gửi.</div></form>`;
  $('#cf').onsubmit = async e => {
    e.preventDefault(); const o = {};
    A.config.forEach(c => { o[c.k] = e.target.elements[c.k].value.trim(); });
    try { const r = await call('admin.saveConfig', { config: o }); toast(r.changed ? 'Đã lưu ' + r.changed + ' thay đổi' : 'Không có thay đổi nào'); S.projects = null; setInit(await call('init')); viewAdmin('cau-hinh'); }
    catch (err) { toast(err.message, true); }
  };
}
async function adminLog(box) {
  box.innerHTML = `<div class="panel"><div class="filters"><input class="in search" type="search" id="lq" placeholder="Tìm theo email, hành động, mã dự án…" aria-label="Tìm nhật ký"><span class="count" id="lc"></span></div><div id="ll"><div class="empty muted">Đang tải…</div></div></div>`;
  let t;
  const load = async () => {
    try {
      const r = await call('admin.log', { q: $('#lq').value });
      $('#lc').textContent = r.total > 500 ? `500/${r.total} dòng gần nhất` : `${r.total} dòng`;
      $('#ll').innerHTML = r.rows.length ? `<div class="tw"><table class="t"><thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Hành động</th><th>Mã</th><th>Trường</th><th>Cũ → Mới</th><th>Ghi chú</th></tr></thead><tbody>
        ${r.rows.map(x => `<tr><td>${esc(String(x.luc).replace('T', ' '))}</td><td>${esc(x.email)}</td><td>${esc(x.hanhDong)}</td><td>${esc(x.ma)}</td><td>${esc(x.truong)}</td><td>${x.cu || x.moi ? `<s class="muted">${esc(x.cu)}</s> → ${esc(x.moi)}` : ''}</td><td class="small">${esc(x.ghiChu)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">Không có dòng nhật ký nào khớp.</div>`;
    } catch (e) { toast(e.message, true); }
  };
  $('#lq').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
  load();
}

/* ================= Khởi động ================= */
// Skip link: chuyển focus tới nội dung chính, không đổi hash (hash dùng cho định tuyến)
document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); const v = $('#view'); if (v) v.focus(); });
async function start() {
  if (!CFG.apiUrl || (!CFG.clientId && !CFG.dev)) {
    return gate({ config: 'Chưa cấu hình kết nối: điền apiUrl và clientId trong file config.js (xem HUONG-DAN-TRIEN-KHAI.md).' });
  }
  try {
    const r = await api('init');
    if (!r.ok) throw Object.assign(new Error(r.error), { denied: r.denied });
    setInit(r);
    $('#loading').hidden = true; $('#app').hidden = false;
    shell(); route();
  } catch (e) {
    $('#loading').hidden = true;
    gate({ error: e.message });
  }
}
start();
