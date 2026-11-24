/* TOOL IPC — giao diện GĐ2 + GĐ3: tổng quan (dashboard), cảnh báo, đối soát, KPI, báo cáo + xuất Excel, email & lịch gửi.
 * Dùng chung tiện ích của app.js ($, esc, call, api, dialog, toast, S, ...) và logic.js (IPC). */
'use strict';

const DS_ST = { chua_giao: 'Chưa giao CBDS', thieu: 'Thiếu thông tin', den_han: 'Đến hạn đối soát', sap_han: 'Sắp đến hạn', on: 'Đúng lịch' };
const DS_ST_CLS = { chua_giao: 'qua_han', thieu: 'sap_han', den_han: 'qua_han', sap_han: 'sap_han', on: 'on' };
const KY_ST = { xong: 'Đã xong', den_han: 'Đến hạn', sap_han: 'Sắp đến hạn', chua: 'Chưa đến hạn' };
const KY_CLS = { xong: 'xong', den_han: 'qua_han', sap_han: 'sap_han', chua: 'dung_han' };
const MUC = { 1: ['Thường', 'on'], 2: ['Quan trọng', 'sap_han'], 3: ['Khẩn', 'qua_han'] };
const fmtN = n => Number(n || 0).toLocaleString('vi-VN');

async function loadDs(force) {
  if (S.ds && !force) return S.ds;
  S.ds = (await call('ds.list')).records;
  return S.ds;
}
function upsertDs(r) { if (!S.ds) return; const i = S.ds.findIndex(x => x.id === r.id); if (i >= 0) S.ds[i] = r; else S.ds.push(r); }
// Dự án trong phạm vi + hồ sơ đối soát của nó (gắn link ở trang chi tiết dự án)
async function linkDsFor(p) {
  try {
    const ds = (await loadDs()).find(d => d.maDuAn === p.id);
    const box = $('.detail-head .codes'); if (!ds || !box) return;
    box.insertAdjacentHTML('beforeend', `<a class="tag on" href="#/doi-soat/${encodeURIComponent(ds.id)}">Hồ sơ đối soát ${esc(ds.id)}</a>`);
  } catch (e) { /* không có quyền xem đối soát */ }
}

/* ================= Khoảng thời gian ================= */
function rangeOf(key, td) {
  const y = td.slice(0, 4), ym = td.slice(0, 7);
  if (key === 'quy') { const q = IPC.quarterStart(ym); return { from: q + '-01', to: td, l: 'Quý này' }; }
  if (key === 'nam') return { from: y + '-01-01', to: td, l: 'Năm nay' };
  if (key === '12t') return { from: IPC.addMonths(ym + '-01', -11), to: td, l: '12 tháng gần nhất' };
  return { from: ym + '-01', to: td, l: 'Tháng này' };
}
const RANGE_KEYS = [['thang', 'Tháng này'], ['quy', 'Quý này'], ['nam', 'Năm nay'], ['12t', '12 tháng']];

/* ================= Biểu đồ cột theo tháng: port ký HĐHT và port online ================= */
// 2 chuỗi cùng đơn vị (port) → cột nhóm, 1 trục. Màu đã kiểm tra bằng validate_palette.js (CVD ΔE 18.9).
const SERIES = [{ k: 'portHDHT', l: 'Port ký HĐHT', c: '#0066B3' }, { k: 'portOnline', l: 'Port online', c: '#14A3A8' }];
function monthSeries(ps, td, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const ym = IPC.addMonths(td.slice(0, 7) + '-01', -i).slice(0, 7), r = IPC.monthRange(ym), st = IPC.periodStats(ps, r.from, r.to);
    out.push({ ym, portHDHT: st.portHDHT, portOnline: st.portOnline });
  }
  return out;
}
function niceMax(v) { if (v <= 0) return 10; const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
function barChart(data) {
  const W = 720, H = 230, L = 44, R = 8, T = 10, B = 28, iw = W - L - R, ih = H - T - B;
  const max = niceMax(Math.max(1, ...data.flatMap(d => SERIES.map(s => d[s.k])))), gw = iw / data.length, bw = Math.min(16, (gw - 10) / 2);
  const y = v => T + ih - (v / max) * ih;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="#EDF1F6"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#7A869E">${fmtN(v)}</text>`; }
  data.forEach((d, i) => {
    const x0 = L + i * gw + (gw - bw * 2 - 2) / 2;
    SERIES.forEach((s, j) => {
      const v = d[s.k], h = Math.max(0, T + ih - y(v)), x = x0 + j * (bw + 2);
      const tip = `${s.l} tháng ${d.ym.slice(5)}/${d.ym.slice(0, 4)}: ${fmtN(v)}`;
      if (h > 0) g += `<path d="M${x},${T + ih} v${-Math.max(0, h - 3)} q0,-3 3,-3 h${bw - 6} q3,0 3,3 v${Math.max(0, h - 3)} z" fill="${s.c}"><title>${esc(tip)}</title></path>`;
      g += `<rect x="${x - 1}" y="${T}" width="${bw + 2}" height="${ih}" fill="transparent"><title>${esc(tip)}</title></rect>`;
    });
    g += `<text x="${L + i * gw + gw / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7A869E">T${+d.ym.slice(5)}</text>`;
  });
  g += `<line x1="${L}" x2="${W - R}" y1="${T + ih}" y2="${T + ih}" stroke="#C5CFDC"/>`;
  return `<div class="legend" style="margin:0 0 8px">${SERIES.map(s => `<span><i style="background:${s.c};border-color:${s.c};border-radius:3px"></i>${s.l}</span>`).join('')}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ port ký HĐHT và port online 12 tháng gần nhất" style="width:100%;height:auto;display:block">${g}</svg>
    <details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:var(--blue)">Xem bảng số liệu</summary>
    <div class="tw"><table class="t"><thead><tr><th>Tháng</th>${SERIES.map(s => `<th class="num">${s.l}</th>`).join('')}</tr></thead><tbody>${data.map(d => `<tr><td>${d.ym.slice(5)}/${d.ym.slice(0, 4)}</td>${SERIES.map(s => `<td class="num">${fmtN(d[s.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

/* ================= Tổng quan ================= */
function alertsPanel(alerts) {
  const top = alerts.slice(0, 6);
  return `<div class="panel"><div class="panel-h"><h2>Cảnh báo hôm nay (${alerts.length})</h2></div>
    ${top.length ? `<div class="tw"><table class="t cards"><thead><tr><th>Mức độ</th><th>Loại</th><th>Nội dung</th></tr></thead><tbody>${top.map(a => `<tr>
      <td><span class="tag ${MUC[a.mucDo][1]}">${MUC[a.mucDo][0]}</span></td><td class="small" data-l="Loại">${esc(a.loai)}</td>
      <td><a class="rowlink" href="${a.kind === 'du_an' ? '#/du-an/' : '#/doi-soat/'}${encodeURIComponent(a.ref)}">${esc(a.msg)}</a></td></tr>`).join('')}</tbody></table></div>
      ${alerts.length > 6 ? `<div class="panel-b note">Còn ${alerts.length - 6} cảnh báo khác — xem trong danh sách dự án và đối soát.</div>` : ''}`
    : `<div class="empty"><h3>Không có cảnh báo</h3><p>Không có mốc nào sắp đến hạn hay quá hạn trong phạm vi của bạn.</p></div>`}</div>`;
}
/* Bộ lọc Tổng quan: phòng, PM, khu vực, chi nhánh, CĐT / đơn vị hợp tác / MST — nằm trên URL (#/?phong=…&pm=…) */
const OV_KEYS = ['phong', 'pm', 'kv', 'cn', 'q'];
let ALERT_CACHE = null;
async function cachedAlerts() {
  if (ALERT_CACHE && Date.now() - ALERT_CACHE.t < 60000) return ALERT_CACHE.a;
  const a = (await call('alerts.list')).alerts; ALERT_CACHE = { t: Date.now(), a }; return a;
}
function filterProjects(ps, f) {
  const q = (f.q || '').trim().toLowerCase();
  return ps.filter(p => (!f.phong || p.phong === f.phong) && (!f.pm || p.emailPM === f.pm) && (!f.kv || p.khuVuc === f.kv) && (!f.cn || p.maCN === f.cn)
    && (!q || [p.tenCDT, p.mstCDT, p.tenDVHT, p.mstDVHT].join(' ').toLowerCase().includes(q)));
}
const qsOf = o => { const q = new URLSearchParams(); Object.keys(o).forEach(k => { if (o[k]) q.set(k, o[k]); }); const s = q.toString(); return s ? '?' + s : ''; };
function overviewFilters(psAll, f, key) {
  const P = S.perms, opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
  const pms = [...new Set(psAll.filter(p => !f.phong || p.phong === f.phong).map(p => p.emailPM))].map(e => ({ e, n: (S.userMap[e] || {}).hoTen || e })).sort((a, b) => a.n.localeCompare(b.n, 'vi'));
  const cns = S.cn.filter(c => !f.kv || c.khuVuc === f.kv);
  const active = OV_KEYS.some(k => f[k]);
  return `<form class="panel filters ov-filters" id="ovf" aria-label="Lọc số liệu tổng quan">
    ${P.bgd || P.tpVanHanh ? `<select class="in" name="phong" aria-label="Phòng"><option value="">Tất cả phòng</option>${IPC.PHONG_DAU_TU.map(x => opt(x, x, f.phong)).join('')}</select>` : ''}
    ${P.bgd || P.tpDauTu || P.tpVanHanh ? `<select class="in" name="pm" aria-label="PM"><option value="">Tất cả PM</option>${pms.map(x => opt(x.e, x.n, f.pm)).join('')}</select>` : ''}
    <select class="in" name="kv" aria-label="Khu vực"><option value="">Tất cả khu vực</option>${S.kv.map(k => opt(k.ma, k.ma, f.kv)).join('')}</select>
    <select class="in" name="cn" aria-label="Chi nhánh"><option value="">Tất cả chi nhánh</option>${cns.map(c => opt(c.ma, c.ma + ' – ' + c.ten, f.cn)).join('')}</select>
    <input class="in search" name="q" type="search" value="${esc(f.q)}" placeholder="CĐT, đơn vị hợp tác, MST…" title="Gõ rồi nhấn Enter để lọc" aria-label="Lọc theo chủ đầu tư, đơn vị hợp tác hoặc MST (nhấn Enter để lọc)" autocomplete="off" spellcheck="false">
    ${active ? `<a class="btn ghost" href="#/${qsOf({ ky: key === 'thang' ? '' : key })}">Bỏ lọc</a>` : ''}
  </form>`;
}
function bindOverviewFilters(f, key) {
  const form = $('#ovf'); if (!form) return;
  const go = () => {
    const o = { ky: key === 'thang' ? '' : key };
    OV_KEYS.forEach(k => { o[k] = form.elements[k] ? form.elements[k].value.trim() : ''; });
    if (o.phong !== f.phong) o.pm = ''; // đổi phòng → bỏ PM cũ
    if (o.kv !== f.kv) o.cn = '';       // đổi khu vực → bỏ chi nhánh cũ
    location.hash = '#/' + qsOf(o);
  };
  form.querySelectorAll('select').forEach(s => s.addEventListener('change', go));
  form.addEventListener('submit', e => { e.preventDefault(); go(); });
  form.elements.q.addEventListener('change', go);
}
async function viewOverview(Q) {
  loadingView();
  const P = S.perms, key = (Q && Q.get('ky')) || 'thang', rg = rangeOf(key, S.today);
  const f = {}; OV_KEYS.forEach(k => { f[k] = (Q && Q.get(k)) || ''; });
  const active = OV_KEYS.some(k => f[k]);
  const [alertsAll] = await Promise.all([cachedAlerts(), P.xemDuAn ? loadProjects() : null, loadDs().catch(() => [])]);
  const head = `<div class="page-head"><div><h1>Tổng quan</h1><p>Cập nhật đến ngày ${vn(S.today)}.</p></div>
    ${P.taoDuAn ? `<div class="actions"><a class="btn primary" href="#/du-an/moi">${ico('plus')}Thêm dự án</a></div>` : ''}</div>`;
  const dsAll = S.ds || [];
  let ds = dsAll, alerts = alertsAll, ids = null;
  if (P.xemDuAn && active) {
    ids = new Set(filterProjects(S.projects, f).map(p => p.id));
    const dsById = {}; dsAll.forEach(d => { dsById[d.id] = d; });
    ds = dsAll.filter(d => ids.has(d.maDuAn));
    alerts = alertsAll.filter(a => a.kind === 'du_an' ? ids.has(a.ref) : (dsById[a.ref] && ids.has(dsById[a.ref].maDuAn)));
  }
  const dsTiles = () => { const c = s => ds.filter(d => d._status === s).length; return `
    <a class="stat" href="#/doi-soat"><b>${ds.length}</b><span>Hồ sơ đối soát</span></a>
    <a class="stat red" href="#/doi-soat?st=den_han"><b>${c('den_han')}</b><span>Đến hạn đối soát</span></a>
    <a class="stat orange" href="#/doi-soat?st=thieu"><b>${c('thieu')}</b><span>Thiếu thông tin</span></a>
    <a class="stat" href="#/doi-soat?st=chua_giao"><b>${c('chua_giao')}</b><span>Chưa giao CBDS</span></a>`; };
  if (!P.xemDuAn) { // CBDS
    view().innerHTML = head + `<div class="stats">${dsTiles()}</div>` + alertsPanel(alerts);
    return;
  }
  const ps = active ? filterProjects(S.projects, f) : S.projects, c = { qua: 0, sap: 0, online: 0 }, stages = {};
  const lf = { phong: f.phong, pm: f.pm, kv: f.kv, cn: f.cn, q: f.q }; // chuyển bộ lọc sang danh sách dự án
  ps.forEach(p => { if (p._health === 'qua_han') c.qua++; if (p._health === 'sap_han') c.sap++; if (p.ngayOnline) c.online++; stages[p._stage] = (stages[p._stage] || 0) + 1; });
  const st = IPC.periodStats(ps, rg.from, rg.to);
  const order = ['Mới tạo', 'Bước 1–2: Hồ sơ', 'Bước 3: Triển khai', 'Bước 4: Khai thác', 'Đã online'], max = Math.max(1, ...Object.values(stages));
  const scope = P.bgd || P.tpVanHanh ? 'toàn trung tâm' : P.tpDauTu ? 'phòng ' + S.me.phong : 'của bạn';
  const act = [['soDuAn', 'Dự án mới (gửi KSTK)'], ['portHDHT', 'Port ký HĐHT'], ['portOnline', 'Port online'], ['khaoSat', 'Khảo sát'], ['thamDinh', 'Thẩm định'], ['kyHDHT', 'Ký HĐHT'], ['dntk', 'DNTK'], ['hsxp', 'HSXP']];
  const byPM = P.bgd || P.tpDauTu || P.tpVanHanh;
  let pmRows = '';
  if (byPM) {
    const g = {}; ps.forEach(p => { (g[p.emailPM] = g[p.emailPM] || []).push(p); });
    pmRows = Object.keys(g).map(e => ({ e, n: (S.userMap[e] || {}).hoTen || e, ph: (S.userMap[e] || {}).phong || '', l: g[e], s: IPC.periodStats(g[e], rg.from, rg.to) }))
      .sort((a, b) => a.n.localeCompare(b.n, 'vi')).map(x => `<tr><td>${esc(x.n)}</td><td>${esc(x.ph)}</td><td class="num">${x.l.length}</td><td class="num">${fmtN(x.s.portHDHT)}</td><td class="num">${fmtN(x.s.portOnline)}</td><td class="num">${x.s.kstk}</td><td class="num">${x.s.thamDinh}</td><td class="num">${x.s.kyHDHT}</td><td class="num">${x.s.dntk}</td><td class="num">${x.s.hsxp}</td><td class="num">${x.l.filter(p => p._health === 'qua_han').length}</td></tr>`).join('');
  }
  view().innerHTML = head + overviewFilters(S.projects, f, key) + `
    ${active ? `<p class="note" style="margin:-6px 0 12px">Đang lọc: ${ps.length}/${S.projects.length} dự án. Các số liệu, cảnh báo và biểu đồ bên dưới chỉ tính các dự án này.</p>` : ''}
    <div class="stats">
      <a class="stat" href="#/du-an${qsOf(lf)}"><b>${ps.length}</b><span>Dự án ${esc(scope)}${active ? ' (đang lọc)' : ''}</span></a>
      <a class="stat red" href="#/du-an${qsOf(Object.assign({}, lf, { health: 'qua_han' }))}"><b>${c.qua}</b><span>Có mốc quá hạn</span></a>
      <a class="stat orange" href="#/du-an${qsOf(Object.assign({}, lf, { health: 'sap_han' }))}"><b>${c.sap}</b><span>Có mốc sắp đến hạn</span></a>
      <a class="stat green" href="#/du-an${qsOf(Object.assign({}, lf, { stage: 'Đã online' }))}"><b>${c.online}</b><span>Đã online</span></a>
    </div>
    ${alertsPanel(alerts)}
    <div class="panel"><div class="panel-h"><h2>Hoạt động: ${esc(rg.l.toLowerCase())}</h2>
      <div class="seg" role="group" aria-label="Chọn khoảng thời gian">${RANGE_KEYS.map(k => `<a href="#/${qsOf(Object.assign({}, lf, { ky: k[0] === 'thang' ? '' : k[0] }))}"${k[0] === key ? ' aria-current="true"' : ''}>${k[1]}</a>`).join('')}</div></div>
      <div class="panel-b"><div class="mini-stats">${act.map(a => `<div><b>${fmtN(st[a[0]])}</b><span>${a[1]}</span></div>`).join('')}</div>
      <p class="note" style="margin:10px 0 0">Từ ${vn(rg.from)} đến ${vn(rg.to)}. Mỗi số đếm dự án có ngày tương ứng nằm trong khoảng; port ký HĐHT = tổng port đầu tư của dự án ký HĐHT trong khoảng.</p></div></div>
    <div class="panel"><div class="panel-h"><h2>Port theo tháng</h2></div><div class="panel-b">${barChart(monthSeries(ps, S.today, 12))}</div></div>
    ${byPM ? `<div class="panel"><div class="panel-h"><h2>Theo PM: ${esc(rg.l.toLowerCase())}</h2></div><div class="tw"><table class="t"><thead><tr><th>PM</th><th>Phòng</th><th class="num">Số dự án</th><th class="num">Port ký HĐHT</th><th class="num">Port online</th><th class="num">KSTK</th><th class="num">Thẩm định</th><th class="num">Ký HĐHT</th><th class="num">DNTK</th><th class="num">HSXP</th><th class="num">Có mốc quá hạn</th></tr></thead><tbody>${pmRows || `<tr><td colspan="11" class="empty">Chưa có dự án.</td></tr>`}</tbody></table></div></div>` : ''}
    <div class="panel"><div class="panel-h"><h2>Dự án theo bước</h2></div><div class="panel-b stages">
      ${order.map(s => `<div class="stage-row"><span>${s}</span><div class="bar"><i style="width:${(stages[s] || 0) / max * 100}%"></i></div><b class="num">${stages[s] || 0}</b></div>`).join('')}
    </div></div>
    ${ds.length ? `<div class="stats" style="margin-top:16px">${dsTiles()}</div>` : ''}`;
  bindOverviewFilters(f, key);
}

/* ================= Menu (điện thoại) ================= */
function viewMenu() {
  view().innerHTML = `<div class="page-head"><div><h1>Menu</h1></div></div><div class="panel"><nav class="menu-list" aria-label="Tất cả mục">${navItems().map(x => `<a href="${x.h}">${ico(x.i)}<span>${x.l}</span></a>`).join('')}</nav></div>`;
}

/* ================= Đối soát: danh sách ================= */
function nextKy(d) { return d._periods.filter(k => k.st !== 'xong').sort((a, b) => a.han < b.han ? -1 : 1)[0]; }
async function viewDsList(Q) {
  loadingView();
  const list = await loadDs(true), P = S.perms;
  const f = { q: Q.get('q') || '', cbds: Q.get('cbds') || '', st: Q.get('st') || '' };
  const cbdsList = S.users.filter(u => u.vaiTro === 'CBDS');
  view().innerHTML = `<div class="page-head"><div><h1>Đối soát</h1><p>Hồ sơ đối soát hợp đồng hợp tác với chủ đầu tư và đối tác.</p></div>
    ${P.taoDoiSoat ? `<div class="actions"><a class="btn primary" href="#/doi-soat/moi">${ico('plus')}Thêm hồ sơ</a></div>` : ''}</div>
    <div class="panel"><div class="filters">
      <input class="in search" type="search" data-f="q" placeholder="Tìm theo mã hồ sơ, Mã Inside, tên dự án…" spellcheck="false" value="${esc(f.q)}" aria-label="Tìm hồ sơ" autocomplete="off">
      <select class="in" data-f="cbds" aria-label="CBDS"><option value="">Tất cả CBDS</option><option value="-"${f.cbds === '-' ? ' selected' : ''}>Chưa giao</option>${cbdsList.map(u => `<option value="${esc(u.email)}"${f.cbds === u.email ? ' selected' : ''}>${esc(u.hoTen || u.email)}</option>`).join('')}</select>
      <select class="in" data-f="st" aria-label="Tình trạng"><option value="">Mọi tình trạng</option>${Object.keys(DS_ST).map(k => `<option value="${k}"${f.st === k ? ' selected' : ''}>${DS_ST[k]}</option>`).join('')}</select>
      <span class="count" id="cnt"></span></div><div id="dlist"></div></div>`;
  const draw = () => {
    const q = f.q.trim().toLowerCase();
    const l = list.filter(d => (!q || [d.id, d.maInside, d.maDSDoiSoat, d.tenDuAn].join(' ').toLowerCase().includes(q))
      && (!f.cbds || (f.cbds === '-' ? !d.emailCBDS : d.emailCBDS === f.cbds)) && (!f.st || d._status === f.st));
    $('#cnt').textContent = `${l.length}/${list.length} hồ sơ`;
    const ord = { chua_giao: 0, den_han: 1, thieu: 2, sap_han: 3, on: 4 };
    l.sort((a, b) => ord[a._status] - ord[b._status] || a.tenDuAn.localeCompare(b.tenDuAn, 'vi'));
    $('#dlist').innerHTML = !list.length ? `<div class="empty"><h3>Chưa có hồ sơ đối soát</h3><p>Hồ sơ được tạo tự động khi dự án có ngày online, hoặc nạp hồ sơ đang đối soát từ biểu mẫu Excel (sheet DoiSoat).</p></div>`
      : !l.length ? `<div class="empty"><h3>Không có hồ sơ khớp bộ lọc</h3></div>`
      : `<div class="tw"><table class="t cards"><thead><tr><th>Mã hồ sơ</th><th>Dự án</th><th>CBDS</th><th>Kỳ tiếp theo</th><th>Tình trạng</th><th>Hết hạn HĐHT</th></tr></thead><tbody>${l.map(d => { const k = nextKy(d); return `<tr class="click" data-id="${esc(d.id)}">
        <td class="code" translate="no">${esc(d.id)}${d.maInside ? `<small>${esc(d.maInside)}</small>` : ''}</td>
        <td class="name"><a class="rowlink" href="#/doi-soat/${encodeURIComponent(d.id)}"><b>${esc(d.tenDuAn)}</b></a><span>${esc(d.nguon)}</span></td>
        <td data-l="CBDS">${d.emailCBDS ? esc(d.tenCBDS) : '<span class="tag qua_han">Chưa giao</span>'}</td>
        <td data-l="Kỳ tiếp theo">${k ? `${esc(k.loaiTen)} kỳ ${k.n}: ${vn(k.han)}` : '—'}</td>
        <td><span class="tag ${DS_ST_CLS[d._status]}">${DS_ST[d._status]}</span></td>
        <td data-l="Hết hạn HĐHT">${d._hetHan ? vn(d._hetHan) : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
    $$('tr.click', view()).forEach(tr => tr.onclick = e => { if (!e.target.closest('a')) location.hash = '#/doi-soat/' + encodeURIComponent(tr.dataset.id); });
  };
  $$('[data-f]', view()).forEach(el => el.oninput = () => { f[el.dataset.f] = el.value; setHashQuery('/doi-soat', f); draw(); });
  draw();
}

/* ================= Đối soát: chi tiết ================= */
function dsFieldText(f, v) {
  if (v === '' || v === null || v === undefined) return '';
  if (f.t === 'date') return vn(v);
  if (f.t === 'pct') return IPC.pctText(v);
  if (f.t === 'pm' || f.t === 'cbds') return ((S.userMap[v] || {}).hoTen || v) + ' (' + v + ')';
  if (f.t === 'num') return String(v).replace('.', ',');
  return v;
}
async function viewDsDetail(id, Q) {
  loadingView();
  const r = await call('ds.get', { id }), d = r.record, P = S.perms, full = d._edit === 'all';
  upsertDs(d);
  const tab = Q.get('tab') || 'info';
  view().innerHTML = `<a class="back" href="#/doi-soat">${ico('back')}Danh sách đối soát</a>
    <div class="detail-head"><div><h1>${esc(d.tenDuAn)}</h1>
      <div class="codes"><span class="code" translate="no">${esc(d.id)}</span>${d.maInside ? `<span class="muted">Mã Inside <span translate="no">${esc(d.maInside)}</span></span>` : ''}
        <span class="tag ${DS_ST_CLS[d._status]}">${DS_ST[d._status]}</span><span class="tag">${esc(d.nguon)}</span>
        ${d._project ? `<a class="tag on" href="#/du-an/${encodeURIComponent(d._project.id)}">Dự án ${esc(d._project.maInside || d._project.id)}</a>` : ''}</div>
      <div class="codes">CBDS: ${d.emailCBDS ? esc(d.tenCBDS) : 'chưa giao'} · CB đầu tư: ${esc(d.tenCBDT)} · Hết hạn HĐHT: ${d._hetHan ? vn(d._hetHan) : '—'}${d.soLanGiaHan ? ` (đã gia hạn ${d.soLanGiaHan} lần)` : ''}</div>
    </div><div class="actions">
      ${d._edit ? `<a class="btn primary" href="#/doi-soat/${encodeURIComponent(d.id)}/sua">${ico('edit')}${full ? 'Cập nhật' : 'Điền ngày bắt đầu'}</a>` : ''}
      ${P.giaoDoiSoat ? `<button class="btn" id="bAssign">${d.emailCBDS ? 'Chuyển CBDS' : 'Giao CBDS'}</button>` : ''}
      ${full ? `<button class="btn" id="bGH">Gia hạn HĐHT</button>` : ''}
      ${P.bgd || (P.tpVanHanh && P.xoa) ? `<button class="btn danger" id="bDel">${ico('trash')}Xóa</button>` : ''}
    </div></div>
    ${d._status === 'thieu' ? `<div class="alert warn">Hồ sơ còn thiếu thông tin${!d.ngayBatDau ? ', trong đó có ngày bắt đầu kỳ đối soát (ngày có khách hàng đầu tiên)' : ''}. ${d._edit ? 'Bấm Cập nhật để bổ sung.' : ''}</div>` : ''}
    <div class="tabs" role="tablist"><button role="tab" data-t="info">Thông tin</button><button role="tab" data-t="ky">Kỳ đối soát (${d._periods.length})</button><button role="tab" data-t="files">File đính kèm</button><button role="tab" data-t="hist">Lịch sử thay đổi (${r.history.length})</button></div>
    <div id="tab"></div>`;
  const tabs = {
    info: () => `<div class="panel"><div class="panel-b"><dl class="kv">${IPC.DS_FIELDS.map(f => { const t = dsFieldText(f, d[f.k]); return `<div class="${f.wide ? 'wide' : ''}"><dt>${esc(f.l)}</dt><dd class="${t ? '' : 'none'}">${t ? esc(t) : 'Chưa nhập'}</dd></div>`; }).join('')}</dl></div></div>`,
    ky: () => d._periods.length ? `<div class="panel"><div class="tw"><table class="t"><thead><tr><th>Loại</th><th>Kỳ</th><th>Từ ngày</th><th>Hạn</th><th>Tình trạng</th><th>Thực hiện</th>${full ? '<th><span class="sr-only">Thao tác</span></th>' : ''}</tr></thead><tbody>
      ${d._periods.slice().reverse().map(k => `<tr><td>${esc(k.loaiTen)}</td><td class="num">${k.n}</td><td>${vn(k.tu)}</td><td>${vn(k.han)}</td>
        <td><span class="tag ${KY_CLS[k.st]}">${k.st === 'xong' ? esc(k.trangThai) : KY_ST[k.st]}</span></td>
        <td class="small">${k.ngay ? vn(k.ngay) + ' · ' + esc((S.userMap[k.nguoi] || {}).hoTen || k.nguoi) : ''}</td>
        ${full ? `<td><div class="actions">${k.st === 'xong' ? `<button class="btn ghost" data-ky="${k.loai}|${k.n}|">Mở lại</button>` : `<button class="btn ghost" data-ky="${k.loai}|${k.n}|Đã đối soát">Đã đối soát</button><button class="btn ghost" data-ky="${k.loai}|${k.n}|Đã thanh toán">Đã thanh toán</button>`}</div></td>` : ''}</tr>`).join('')}
      </tbody></table></div><div class="panel-b note">Kỳ n có hạn = ngày bắt đầu kỳ đối soát + n × độ dài kỳ. Danh sách hiện các kỳ đã đến hạn và kỳ kế tiếp, không vượt ngày hết hạn HĐHT.</div></div>`
      : `<div class="panel"><div class="empty"><h3>Chưa tính được kỳ đối soát</h3><p>Cần ngày bắt đầu kỳ đối soát và ít nhất một loại đối soát chọn "Có" kèm kỳ (tháng, quý, 6 tháng, năm).</p></div></div>`,
    hist: () => r.history.length ? `<div class="panel"><div class="panel-b hist">${r.history.map(h => `<div class="h"><time>${esc(String(h.luc).replace('T', ' '))}</time><div><b>${esc(h.hanhDong)}</b> · ${esc(h.email)}${h.truong ? `<div class="chg">${esc(h.truong)}: <s>${esc(h.cu || '(trống)')}</s> → ${esc(h.moi || '(trống)')}</div>` : ''}${h.ghiChu ? `<div class="note">${esc(h.ghiChu)}</div>` : ''}</div></div>`).join('')}</div></div>` : `<div class="panel"><div class="empty">Chưa có thay đổi nào.</div></div>`,
    files: () => ''
  };
  const show = (t, sync) => {
    $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    $('#tab').innerHTML = tabs[t]();
    if (t === 'files') attachPanel($('#tab'), 'doi_soat', d.id);
    $$('[data-ky]').forEach(b => b.onclick = async () => {
      const [loai, ky, trangThai] = b.dataset.ky.split('|');
      const ghiChu = await dialog({ title: trangThai ? trangThai + ': kỳ ' + ky : 'Mở lại kỳ ' + ky, body: `<label class="f">Ghi chú (không bắt buộc)<input class="in" id="gc" autocomplete="off" placeholder="VD: số chứng từ, số tiền đối soát…"></label>`, buttons: [{ l: 'Hủy', v: null }, { l: trangThai || 'Mở lại kỳ', cls: 'primary', v: x => $('#gc', x).value }] });
      if (ghiChu === null) return;
      try { await call('ds.ky', { id: d.id, loai, ky: +ky, trangThai, ghiChu }); toast(trangThai ? 'Đã ghi: ' + trangThai : 'Đã mở lại kỳ'); await viewDsDetail(d.id, new URLSearchParams('tab=ky')); }
      catch (e) { toast(e.message, true); }
    });
    if (sync) setHashQuery('/doi-soat/' + encodeURIComponent(d.id), { tab: t === 'info' ? '' : t });
  };
  $$('.tabs button').forEach(b => b.onclick = () => show(b.dataset.t, true));
  show(tabs[tab] ? tab : 'info');
  const bA = $('#bAssign'); if (bA) bA.onclick = async () => {
    const opts = S.users.filter(u => u.vaiTro === 'CBDS' && u.trangThai !== 'Đã nghỉ');
    const e = await dialog({ title: 'Giao hồ sơ ' + d.id, body: `<label class="f">Cán bộ đối soát<select class="in" id="cb"><option value="">— Chọn CBDS —</option>${opts.map(u => `<option value="${esc(u.email)}"${u.email === d.emailCBDS ? ' selected' : ''}>${esc(u.hoTen || u.email)}</option>`).join('')}</select></label>`, buttons: [{ l: 'Hủy', v: null }, { l: 'Giao hồ sơ', cls: 'primary', v: x => $('#cb', x).value }] });
    if (!e) return;
    try { await call('ds.assign', { id: d.id, emailCBDS: e }); toast('Đã giao hồ sơ'); await viewDsDetail(d.id, Q); } catch (err) { toast(err.message, true); }
  };
  const bG = $('#bGH'); if (bG) bG.onclick = async () => {
    if (!d.kyGiaHanNam) { toast('Điền "Kỳ gia hạn (năm)" trước khi gia hạn.', true); return; }
    const neu = IPC.hetHanHDHT(Object.assign({}, d, { soLanGiaHan: (+d.soLanGiaHan || 0) + 1 }));
    if (!await confirmDlg('Gia hạn HĐHT', `Gia hạn thêm ${esc(String(d.kyGiaHanNam).replace('.', ','))} năm. Ngày hết hạn đổi từ ${vn(d._hetHan)} thành ${vn(neu)}.`, 'Gia hạn')) return;
    try { await call('ds.giaHan', { id: d.id }); toast('Đã gia hạn HĐHT'); await viewDsDetail(d.id, Q); } catch (e) { toast(e.message, true); }
  };
  const bD = $('#bDel'); if (bD) bD.onclick = async () => {
    const lyDo = await dialog({ title: 'Xóa hồ sơ đối soát', body: `<p>Xóa hồ sơ <b>${esc(d.id)}</b>? Hồ sơ sẽ ẩn khỏi danh sách; nhật ký vẫn được giữ.</p><label class="f">Lý do<input class="in" id="ly" autocomplete="off"></label>`, buttons: [{ l: 'Hủy', v: null }, { l: 'Xóa hồ sơ', cls: 'danger', v: x => $('#ly', x).value }] });
    if (lyDo === null) return;
    try { await call('ds.delete', { id: d.id, lyDo }); S.ds = null; toast('Đã xóa hồ sơ'); location.hash = '#/doi-soat'; } catch (e) { toast(e.message, true); }
  };
}

/* ================= Đối soát: biểu mẫu ================= */
function dsInput(f, v, disabled) {
  const id = 'd_' + f.k, val = v === null || v === undefined ? '' : v, dis = disabled ? ' disabled' : '';
  let ctl;
  if (f.t === 'date') ctl = `<input class="in" type="date" id="${id}" name="${f.k}" value="${esc(val)}"${dis}>`;
  else if (f.t === 'num') ctl = `<input class="in" inputmode="decimal" id="${id}" name="${f.k}" value="${esc(String(val).replace('.', ','))}" placeholder="VD: 10…" autocomplete="off"${dis}>`;
  else if (f.t === 'pct') ctl = `<input class="in" inputmode="decimal" id="${id}" name="${f.k}" value="${esc(val === '' ? '' : IPC.pctText(val))}" placeholder="VD: 25%…" autocomplete="off"${dis}>`;
  else if (f.t === 'list') ctl = `<select class="in" id="${id}" name="${f.k}"${dis}><option value="">— Chọn —</option>${IPC.LISTS[f.o].map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.t === 'pm' || f.t === 'cbds') {
    const us = S.users.filter(u => f.t === 'pm' ? IPC.PHONG_DAU_TU.includes(u.phong) && ['PM', 'TP'].includes(u.vaiTro) : u.vaiTro === 'CBDS').filter(u => u.trangThai !== 'Đã nghỉ' || u.email === val);
    ctl = `<select class="in" id="${id}" name="${f.k}"${dis}><option value="">— Chọn —</option>${us.map(u => `<option value="${esc(u.email)}"${u.email === val ? ' selected' : ''}>${esc(u.hoTen || u.email)}</option>`).join('')}</select>`;
  } else if (f.t === 'kv') ctl = `<select class="in" id="${id}" name="${f.k}"${dis}><option value="">— Chọn —</option>${S.kv.map(k => `<option value="${esc(k.ma)}"${k.ma === val ? ' selected' : ''}>${esc(k.ma)}</option>`).join('')}</select>`;
  else if (f.t === 'cn') ctl = `<select class="in" id="${id}" name="${f.k}"${dis}><option value="">— Chọn —</option>${S.cn.map(c => `<option value="${esc(c.ma)}"${c.ma === val ? ' selected' : ''}>${esc(c.ma)} – ${esc(c.ten)}</option>`).join('')}</select>`;
  else if (f.k === 'ghiChu') ctl = `<textarea class="in" id="${id}" name="${f.k}" autocomplete="off"${dis}>${esc(val)}</textarea>`;
  else ctl = `<input class="in" id="${id}" name="${f.k}" value="${esc(val)}" autocomplete="off"${/^ma/.test(f.k) ? ' spellcheck="false"' : ''}${dis}>`;
  return `<label class="f${f.wide ? ' wide' : ''}" data-k="${f.k}" for="${id}"><span>${esc(f.l)}${f.req ? ' <span class="req" aria-label="bắt buộc">*</span>' : ''}</span>${ctl}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}<span class="msg" aria-live="polite"></span></label>`;
}
async function viewDsForm(id, Q) {
  loadingView();
  const P = S.perms;
  let d = null, init = {};
  if (id) { d = (await call('ds.get', { id })).record; if (!d._edit) { toast('Bạn không sửa được hồ sơ này.', true); location.hash = '#/doi-soat/' + encodeURIComponent(id); return; } init = d; }
  else {
    if (!P.taoDoiSoat) { location.hash = '#/doi-soat'; return; }
    if (P.cbds) init.emailCBDS = S.me.email;
  }
  const onlyStart = d && d._edit === 'ngayBatDau';
  const back = d ? '#/doi-soat/' + encodeURIComponent(d.id) : '#/doi-soat';
  view().innerHTML = `<a class="back" href="${back}">${ico('back')}${d ? 'Quay lại hồ sơ' : 'Danh sách đối soát'}</a>
    <div class="page-head"><div><h1>${d ? (onlyStart ? 'Điền ngày bắt đầu kỳ đối soát' : 'Cập nhật hồ sơ đối soát') : 'Thêm hồ sơ đối soát'}</h1><p>${d ? esc(d.tenDuAn) + ' · ' + esc(d.id) : 'Hồ sơ dự án đang đối soát (luồng 1). Dự án mới online được tạo hồ sơ tự động.'}</p></div></div>
    ${onlyStart ? '<div class="alert info">Bạn chỉ điền được ngày bắt đầu kỳ đối soát (ngày có khách hàng đầu tiên). Các thông tin khác do CBDS cập nhật.</div>' : ''}
    <div id="formAlert"></div>
    <form id="df" novalidate><div class="panel form-sec"><div class="panel-b grid-f">${IPC.DS_FIELDS.map(f => dsInput(f, init[f.k], onlyStart && f.k !== 'ngayBatDau')).join('')}</div></div>
    <div class="form-bar"><a class="btn" href="${back}">Hủy</a><button class="btn primary" type="submit">${ico('check')}${d ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button></div></form>`;
  const form = $('#df');
  const read = () => { const o = Object.assign({}, d ? { id: d.id } : {}); IPC.DS_FIELDS.forEach(f => { o[f.k] = form.elements[f.k].value; }); return o; };
  const mark = (errs, warns) => {
    $$('label.f', form).forEach(l => { l.classList.remove('has-err', 'has-warn'); $('.msg', l).textContent = ''; });
    (warns || []).forEach(w => { const l = $(`label.f[data-k="${w.k}"]`, form); if (l) { l.classList.add('has-warn'); $('.msg', l).textContent = w.m; } });
    (errs || []).forEach(e => { const l = $(`label.f[data-k="${e.k}"]`, form); if (l) { l.classList.add('has-err'); $('.msg', l).textContent = e.m; } });
    const el = $('label.f.has-err .in', form); if (el) el.focus();
  };
  form.addEventListener('input', () => { S.dirty = true; });
  form.onsubmit = async e => {
    e.preventDefault();
    const box = $('#formAlert');
    if (!onlyStart) {
      const n = IPC.normalizeDS(read()), users = {}, kv = {}, cn = {};
      S.users.forEach(u => { users[u.email] = u; }); S.kv.forEach(k => { kv[k.ma] = k; }); S.cn.forEach(c => { cn[c.ma] = c; });
      const v = IPC.validateDS(Object.assign({ id: d ? d.id : '' }, n.r), { users, kv, cn, others: (S.ds || []).filter(x => !d || x.id !== d.id), bad: n.bad });
      if (v.errors.length) { box.innerHTML = `<div class="alert err"><b>Chưa lưu được — còn ${v.errors.length} lỗi.</b></div>`; mark(v.errors, []); return; }
    }
    box.innerHTML = '';
    const btn = $('button[type=submit]', form), html = btn.innerHTML; btn.disabled = true; btn.textContent = 'Đang lưu…';
    try {
      let r = await api('ds.save', { record: read() });
      if (r.ok && r.needConfirm) {
        mark([], r.warnings);
        const go = await dialog({ title: 'Kiểm tra cảnh báo trước khi lưu', body: `<ul>${r.warnings.map(w => `<li>${esc(w.m)}</li>`).join('')}</ul><p class="muted">Bấm <b>Vẫn lưu</b> nếu số liệu đúng.</p>`, buttons: [{ l: 'Quay lại sửa', v: false }, { l: 'Vẫn lưu', v: true, cls: 'primary' }] });
        if (!go) return;
        r = await api('ds.save', { record: read(), confirm: true });
      }
      if (!r.ok) { box.innerHTML = `<div class="alert err">${esc(r.error)}</div>`; mark(r.errors, r.warnings); return; }
      S.dirty = false; upsertDs(r.record);
      toast(r.action === 'Tạo mới' ? 'Đã tạo hồ sơ ' + r.record.id : r.action === 'Không đổi' ? 'Không có thay đổi nào' : 'Đã lưu thay đổi');
      location.hash = '#/doi-soat/' + encodeURIComponent(r.record.id);
    } catch (err) { toast(err.message, true); }
    finally { btn.disabled = false; btn.innerHTML = html; }
  };
}

/* ================= KPI ================= */
function meter(v, t) {
  const pct = t ? Math.min(100, v / t * 100) : 0, ok = t && v >= t;
  return `<div class="kpi-cell"><span>${fmtN(v)} / ${fmtN(t)}</span><div class="bar" role="img" aria-label="${fmtN(v)} trên ${fmtN(t)}"><i style="width:${pct}%;background:${ok ? 'var(--green)' : 'var(--blue)'}"></i></div></div>`;
}
async function viewKPI(Q) {
  loadingView();
  const P = S.perms, ym = /^\d{4}-\d{2}$/.test(Q.get('thang') || '') ? Q.get('thang') : S.today.slice(0, 7);
  if (P.xemDuAn) await loadProjects();
  const ds = await loadDs().catch(() => []);
  const users = {}; S.users.forEach(u => { users[u.email] = u; });
  let pm = P.xemDuAn ? IPC.kpiByPM(S.projects, users, S.cfg, ym) : [];
  if (!(P.bgd || P.tpVanHanh)) pm = pm.filter(k => P.tpDauTu ? k.phong === S.me.phong : k.email === S.me.email);
  const mr = IPC.monthRange(ym);
  let cb = [];
  if (P.bgd || P.tpVanHanh || P.cbds) {
    cb = S.users.filter(u => u.vaiTro === 'CBDS' && u.trangThai !== 'Đã nghỉ' && (!P.cbds || u.email === S.me.email)).map(u => {
      const mine = ds.filter(d => d.emailCBDS === u.email);
      const ky = mine.flatMap(d => d._periods);
      return { u, hoSo: mine.length, xongThang: ky.filter(k => k.st === 'xong' && k.ngay >= mr.from && k.ngay <= mr.to).length, denHan: ky.filter(k => k.st === 'den_han').length };
    });
  }
  const res = k => k.khongDat2Thang ? '<span class="tag qua_han">2 tháng liên tiếp không đạt</span>' : k.datThang ? '<span class="tag xong">Đạt</span>' : '<span class="tag sap_han">Chưa đạt</span>';
  view().innerHTML = `<div class="page-head"><div><h1>KPI</h1><p>Tháng ${ym.slice(5)}/${ym.slice(0, 4)}${ym === S.today.slice(0, 7) ? `, lũy kế đến ${vn(S.today)}` : ''}.</p></div>
    <div class="actions"><label class="f" style="min-width:170px">Chọn tháng<input class="in" type="month" id="ym" value="${ym}"></label>
    ${P.xuat && pm.length ? `<button class="btn" id="xk" style="align-self:flex-end">${ico('down')}Xuất Excel</button>` : ''}</div></div>
    ${P.xemDuAn ? `<div class="panel"><div class="panel-h"><h2>Cán bộ đầu tư (${pm.length})</h2></div>
      ${pm.length ? `<div class="tw"><table class="t kpi"><thead><tr><th>PM</th><th>Phòng</th><th>Port ký HĐHT / KPI</th><th>Port online / KPI</th><th>Lũy kế quý: ký HĐHT</th><th>Lũy kế quý: online</th><th class="num">KSTK</th><th class="num">Thẩm định</th><th class="num">Ký HĐHT</th><th class="num">DNTK</th><th class="num">HSXP</th><th>Kết quả tháng</th></tr></thead><tbody>
        ${pm.map(k => `<tr><td>${esc(k.hoTen)}</td><td>${esc(k.phong)}</td><td>${meter(k.thang.portHDHT, k.kpiHDHT)}</td><td>${meter(k.thang.portOnline, k.kpiOnline)}</td><td>${meter(k.quy.portHDHT, k.quyKpiHDHT)}</td><td>${meter(k.quy.portOnline, k.quyKpiOnline)}</td>
          <td class="num">${k.thang.kstk}</td><td class="num">${k.thang.thamDinh}</td><td class="num">${k.thang.kyHDHT}</td><td class="num">${k.thang.dntk}</td><td class="num">${k.thang.hsxp}</td><td>${res(k)}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty">Chưa có cán bộ đầu tư (vai trò PM) trong phạm vi của bạn.</div>`}
      <div class="panel-b note">Port ký HĐHT = tổng port đầu tư của dự án có ngày ký HĐHT trong tháng. Port online = tổng số port FPT khai báo của dự án có ngày online trong tháng. KPI mặc định ${fmtN(S.cfg.kpiPortHDHT)} và ${fmtN(S.cfg.kpiPortOnline)} port/tháng, chỉnh riêng từng PM ở Quản trị → Nhân sự. Chỉ tiêu lũy kế quý = KPI tháng × số tháng đã qua của quý.</div></div>` : ''}
    ${cb.length ? `<div class="panel"><div class="panel-h"><h2>Cán bộ đối soát</h2></div><div class="tw"><table class="t"><thead><tr><th>CBDS</th><th class="num">Hồ sơ phụ trách</th><th class="num">Kỳ đã xử lý trong tháng</th><th class="num">Kỳ đến hạn chưa xử lý</th></tr></thead><tbody>
      ${cb.map(x => `<tr><td>${esc(x.u.hoTen || x.u.email)}</td><td class="num">${x.hoSo}</td><td class="num">${x.xongThang}</td><td class="num">${x.denHan}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  $('#ym').onchange = e => { if (e.target.value) location.hash = '#/kpi?thang=' + e.target.value; };
  const xk = $('#xk'); if (xk) xk.onclick = () => exportXlsx('KPI_' + ym, [{ name: 'KPI PM', rows: pm.map(k => ({ 'PM': k.hoTen, 'Email': k.email, 'Phòng': k.phong, 'Port ký HĐHT tháng': k.thang.portHDHT, 'KPI ký HĐHT': k.kpiHDHT, 'Port online tháng': k.thang.portOnline, 'KPI online': k.kpiOnline, 'Lũy kế quý ký HĐHT': k.quy.portHDHT, 'KPI quý ký HĐHT': k.quyKpiHDHT, 'Lũy kế quý online': k.quy.portOnline, 'KPI quý online': k.quyKpiOnline, 'KSTK': k.thang.kstk, 'Thẩm định': k.thang.thamDinh, 'Ký HĐHT': k.thang.kyHDHT, 'DNTK': k.thang.dntk, 'HSXP': k.thang.hsxp, 'Kết quả tháng': k.khongDat2Thang ? '2 tháng liên tiếp không đạt' : k.datThang ? 'Đạt' : 'Chưa đạt' })) }]);
}

/* ================= Báo cáo + xuất Excel ================= */
function exportXlsx(name, sheets) {
  if (!window.XLSX) { toast('Thư viện Excel chưa tải xong, thử lại sau vài giây.', true); return; }
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => { const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ 'Không có dữ liệu': '' }]); XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); });
  XLSX.writeFile(wb, name.replace(/[^\w\-]+/g, '_') + '.xlsx');
  toast('Đã tạo file ' + name + '.xlsx');
}
const DATE_FIELDS = [['ngayGuiKSTK', 'Ngày gửi KSTK'], ['ngayKhaoSat', 'Ngày khảo sát'], ['ngayKyHDHT', 'Ngày ký HĐHT'], ['ngayOnline', 'Ngày online'], ['ngayKhoiCong', 'Ngày khởi công']];
async function viewReport(Q) {
  loadingView();
  const ps = await loadProjects(), P = S.perms;
  const f = { tg: Q.get('tg') || 'ngayGuiKSTK', tu: Q.get('tu') || '', den: Q.get('den') || '', pm: Q.get('pm') || '', phong: Q.get('phong') || '', kv: Q.get('kv') || '', cdt: Q.get('cdt') || '', dvht: Q.get('dvht') || '' };
  const pms = [...new Set(ps.map(p => p.emailPM))].map(e => ({ e, n: (S.userMap[e] || {}).hoTen || e }));
  view().innerHTML = `<div class="page-head"><div><h1>Báo cáo</h1><p>Lọc dự án theo thời gian, PM, chủ đầu tư, đơn vị hợp tác rồi xuất Excel.</p></div>
    <div class="actions">${P.xuat ? `<button class="btn primary" id="xk">${ico('down')}Xuất Excel</button>` : '<span class="note">Cần quyền xuất báo cáo để tải file Excel.</span>'}</div></div>
    <form class="panel" id="rf"><div class="panel-b grid-f">
      <label class="f">Lọc theo ngày<select class="in" name="tg">${DATE_FIELDS.map(x => `<option value="${x[0]}"${f.tg === x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label>
      <label class="f">Từ ngày<input class="in" type="date" name="tu" value="${esc(f.tu)}"></label>
      <label class="f">Đến ngày<input class="in" type="date" name="den" value="${esc(f.den)}"></label>
      ${P.bgd || P.tpDauTu || P.tpVanHanh ? `<label class="f">PM<select class="in" name="pm"><option value="">Tất cả</option>${pms.map(x => `<option value="${esc(x.e)}"${f.pm === x.e ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}</select></label>` : ''}
      ${P.bgd || P.tpVanHanh ? `<label class="f">Phòng<select class="in" name="phong"><option value="">Tất cả</option>${IPC.PHONG_DAU_TU.map(x => `<option${f.phong === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
      <label class="f">Khu vực<select class="in" name="kv"><option value="">Tất cả</option>${S.kv.map(k => `<option${f.kv === k.ma ? ' selected' : ''}>${esc(k.ma)}</option>`).join('')}</select></label>
      <label class="f">Chủ đầu tư (tên hoặc MST)<input class="in" name="cdt" value="${esc(f.cdt)}" autocomplete="off" placeholder="VD: 0101…"></label>
      <label class="f">Đơn vị hợp tác (tên hoặc MST)<input class="in" name="dvht" value="${esc(f.dvht)}" autocomplete="off" placeholder="VD: 0101…"></label>
    </div></form><div id="rres"></div>`;
  const form = $('#rf');
  const draw = () => {
    Object.keys(f).forEach(k => { if (form.elements[k]) f[k] = form.elements[k].value.trim(); });
    setHashQuery('/bao-cao', Object.assign({}, f, { tg: f.tg === 'ngayGuiKSTK' ? '' : f.tg }));
    const has = (s, q) => !q || String(s || '').toLowerCase().includes(q.toLowerCase());
    const l = ps.filter(p => (!f.tu || (p[f.tg] && p[f.tg] >= f.tu)) && (!f.den || (p[f.tg] && p[f.tg] <= f.den)) && (!f.pm || p.emailPM === f.pm) && (!f.phong || p.phong === f.phong)
      && (!f.kv || p.khuVuc === f.kv) && (has(p.tenCDT, f.cdt) || has(p.mstCDT, f.cdt)) && (has(p.tenDVHT, f.dvht) || has(p.mstDVHT, f.dvht)));
    const sum = k => l.reduce((s, p) => s + (+p[k] || 0), 0);
    S.reportRows = l;
    $('#rres').innerHTML = `<div class="stats" style="margin-top:16px"><div class="stat"><b>${l.length}</b><span>Dự án</span></div><div class="stat"><b>${fmtN(sum('quyMo'))}</b><span>Quy mô (căn hộ)</span></div><div class="stat"><b>${fmtN(sum('portDauTu'))}</b><span>Port đầu tư</span></div><div class="stat"><b>${fmtN(sum('portFPT'))}</b><span>Port FPT khai báo</span></div></div>
      <div class="panel">${l.length ? `<div class="tw"><table class="t cards"><thead><tr><th>Mã</th><th>Dự án</th><th>PM</th><th>CĐT</th><th>Đơn vị hợp tác</th><th class="num">Quy mô</th><th class="num">Port</th><th>Tình trạng</th></tr></thead><tbody>
        ${l.map(p => `<tr><td class="code" translate="no">${esc(p.maInside || p.id)}</td><td class="name"><a class="rowlink" href="#/du-an/${encodeURIComponent(p.id)}"><b>${esc(p.tenDuAn)}</b></a><span>${esc(p._stage)}</span></td><td data-l="PM">${esc(p.tenPM)}</td><td data-l="CĐT">${esc(p.tenCDT)}<div class="small muted">${esc(p.mstCDT)}</div></td><td data-l="ĐVHT">${esc(p.tenDVHT)}<div class="small muted">${esc(p.mstDVHT)}</div></td><td class="num" data-l="Quy mô">${fmtN(p.quyMo)}</td><td class="num" data-l="Port">${fmtN(p.portDauTu)}</td><td>${healthTag(p._health)}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty"><h3>Không có dự án khớp bộ lọc</h3><p>Nới khoảng ngày hoặc bỏ bớt điều kiện.</p></div>`}</div>`;
  };
  form.addEventListener('input', () => { clearTimeout(form._t); form._t = setTimeout(draw, 250); });
  form.onsubmit = e => e.preventDefault();
  draw();
  const xk = $('#xk'); if (xk) xk.onclick = async () => {
    const rows = (S.reportRows || []).map(p => {
      const o = {}; IPC.FIELDS.forEach(fl => { const v = p[fl.k]; o[fl.l] = fl.t === 'date' ? vn(v) : fl.t === 'pct' ? (v === '' ? '' : v) : v; });
      o['Tên PM'] = p.tenPM; o['Phòng'] = p.phong; o['Bước'] = p._stage; o['Tình trạng'] = HEALTH_TEXT[p._health];
      p._ms.forEach(m => { o['Hạn ' + m.l.toLowerCase()] = vn(m.han); });
      return o;
    });
    const sheets = [{ name: 'Du an', rows }];
    try {
      const ds = await loadDs();
      const ids = new Set((S.reportRows || []).map(p => p.id));
      sheets.push({ name: 'Doi soat', rows: ds.filter(d => !d.maDuAn || ids.has(d.maDuAn)).map(d => { const o = { 'Mã hồ sơ': d.id }; IPC.DS_FIELDS.forEach(fl => { o[fl.l] = fl.t === 'date' ? vn(d[fl.k]) : d[fl.k]; }); o['Hết hạn HĐHT'] = vn(d._hetHan); o['Tình trạng'] = DS_ST[d._status]; const k = nextKy(d); o['Kỳ tiếp theo'] = k ? k.loaiTen + ' kỳ ' + k.n + ' – ' + vn(k.han) : ''; return o; }) });
    } catch (e) { /* không có quyền xem đối soát */ }
    exportXlsx('Bao_cao_TOOL_IPC_' + S.today, sheets);
  };
}

/* ================= Quản trị: email & lịch gửi ================= */
async function adminJobs(box) {
  box.innerHTML = `<div class="empty muted">Đang tải…</div>`;
  let J;
  try { J = await call('admin.jobs'); } catch (e) { box.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return; }
  const hasTrig = ['dailyJob', 'weeklyJob'].every(t => J.triggers.includes(t));
  box.innerHTML = `
    <div class="stats"><div class="stat"><b>${J.quota}</b><span>Email còn gửi được hôm nay</span></div><div class="stat ${J.pending ? 'orange' : ''}"><b>${J.pending}</b><span>Cảnh báo chờ gửi</span></div>
      <div class="stat ${hasTrig ? 'green' : 'red'}"><b>${hasTrig ? 'Đang bật' : 'Chưa cài'}</b><span>Lịch chạy tự động</span></div><div class="stat"><b>${J.todayJobs.length}</b><span>Việc chạy sáng nay</span></div></div>
    ${hasTrig ? '' : `<div class="alert warn">Lịch chạy tự động chưa được cài. Bấm <b>Cài lịch chạy</b> để hệ thống tự gửi cảnh báo 7h hằng ngày và báo cáo tuần vào ${esc(S.cfg.lichBaoCaoTuan || 'Thứ 5, 15:00')}.</div>`}
    ${S.cfg.loopEmail ? '' : `<div class="alert warn">Chưa có email loop IPCMB ở Cấu hình — cảnh báo quá hạn sẽ gửi cho BGD thay thế.</div>`}
    <div class="panel"><div class="panel-h"><h2>Báo cáo và cảnh báo tự động</h2><button class="btn" id="bTrig">Cài lịch chạy</button></div>
      <div class="tw"><table class="t"><thead><tr><th>Báo cáo</th><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody>${J.jobs.map(j => `<tr><td>${esc(j.l)}${J.todayJobs.includes(j.k) ? ' <span class="tag on">Chạy hôm nay</span>' : ''}</td>
        <td><div class="actions"><button class="btn ghost" data-prev="${j.k}">Xem trước</button><button class="btn ghost" data-run="${j.k}">Gửi ngay</button></div></td></tr>`).join('')}</tbody></table></div>
      <div class="panel-b note">Gmail cá nhân gửi được khoảng 100 người nhận/ngày. Mỗi người nhận 1 email cảnh báo gộp/ngày; khi gần hết hạn mức, người có cảnh báo khẩn được gửi trước, phần còn lại gửi vào hôm sau. Báo cáo tuần chạy vào ${esc(S.cfg.lichBaoCaoTuan || 'Thứ 5, 15:00')}; đổi ở Cấu hình → "Lịch báo cáo tuần", lưu xong hệ thống tự cài lại lịch. Google chạy lịch trong vòng 1 giờ kể từ giờ đặt.</div></div>
    <div class="panel"><div class="panel-h"><h2>Lần chạy gần đây</h2></div>${J.runs.length ? `<div class="tw"><table class="t"><thead><tr><th>Thời điểm</th><th>Việc</th><th>Kết quả</th></tr></thead><tbody>${J.runs.map(r => `<tr><td>${esc(String(r.luc).replace('T', ' '))}</td><td>${esc(r.hanhDong)}</td><td class="small">${esc(r.ghiChu)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có lần chạy nào.</div>'}</div>
    <div class="panel"><div class="panel-h"><h2>Hàng đợi cảnh báo (50 mục gần nhất)</h2></div>${J.recent.length ? `<div class="tw"><table class="t"><thead><tr><th>Thời điểm</th><th>Loại</th><th>Mã</th><th>Người nhận</th><th>Trạng thái</th></tr></thead><tbody>${J.recent.map(r => `<tr><td class="small">${esc(String(r.luc).replace('T', ' '))}</td><td>${esc(r.loai)}</td><td translate="no">${esc(r.ma)}</td><td class="small">${esc(r.nguoiNhan)}</td><td><span class="tag ${/^Đã gửi/.test(r.trangThai) ? 'xong' : /^Chờ/.test(r.trangThai) ? 'sap_han' : ''}">${esc(r.trangThai)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Hàng đợi trống.</div>'}</div>`;
  $('#bTrig').onclick = async e => { try { await withBusy(e.currentTarget, 'Đang cài…', () => call('admin.installTriggers')); toast('Đã cài lịch chạy tự động'); adminJobs(box); } catch (err) { toast(err.message, true); } };
  $$('[data-prev]', box).forEach(b => b.onclick = async () => {
    try {
      const r = await withBusy(b, 'Đang tạo…', () => call('admin.previewJob', { job: b.dataset.prev }));
      await dialog({ title: 'Xem trước: ' + (J.jobs.find(j => j.k === b.dataset.prev) || {}).l, body: r.messages.length ? `<p class="muted">${r.messages.length} email sẽ được gửi. Không có email nào được gửi khi xem trước.</p>${r.messages.map(m => `<details class="mail"><summary><b>${esc(m.subject)}</b><br><span class="small muted">Đến: ${esc(m.to)}</span></summary><div class="mail-body">${m.html}</div></details>`).join('')}` : '<p>Hôm nay không có nội dung cần gửi cho báo cáo này.</p>' });
    } catch (e) { toast(e.message, true); }
  });
  $$('[data-run]', box).forEach(b => b.onclick = async () => {
    if (!await confirmDlg('Gửi ngay', 'Gửi email thật cho báo cáo này ngay bây giờ? Email sẽ tính vào hạn mức gửi hôm nay.', 'Gửi ngay')) return;
    try { const r = await withBusy(b, 'Đang gửi…', () => call('admin.runJob', { job: b.dataset.run })); toast(`Đã gửi ${r.sent} email${r.skipped ? ', bỏ qua ' + r.skipped + ' do hết hạn mức' : ''}`); adminJobs(box); } catch (e) { toast(e.message, true); }
  });
}
