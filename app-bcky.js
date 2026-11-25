/* TOOL IPC — Báo cáo kỳ (25/11/2026): tháng, quý, 1H/2H, năm, lũy kế năm.
   So sánh kỳ liền trước và cùng kỳ năm trước. Số liệu: máy chủ trả "atom" theo tháng (đã chốt hoặc tính trực tiếp), trình duyệt gộp. */
const BC_DIMS = [['phong', 'Phòng'], ['emailPM', 'Nhân viên'], ['khuVuc', 'Khu vực'], ['hinhThuc', 'Hình thức']];
const BC_CACHE = {};
async function bcLoad(y) {
  if (!BC_CACHE[y]) BC_CACHE[y] = await call('bc.data', { year: y });
  return BC_CACHE[y];
}
function bcPeriodOptions(type) {
  if (type === 'thang' || type === 'luyke') return Array.from({ length: 12 }, (_, i) => [i + 1, (type === 'luyke' ? 'Đến hết tháng ' : 'Tháng ') + (i + 1)]);
  if (type === 'quy') return [1, 2, 3, 4].map(n => [n, 'Quý ' + n]);
  if (type === 'nua') return [[1, '1H (tháng 1–6)'], [2, '2H (tháng 7–12)']];
  return [];
}
function bcDefaultN(type, today) {
  const m = +today.slice(5, 7);
  return type === 'quy' ? Math.ceil(m / 3) : type === 'nua' ? (m <= 6 ? 1 : 2) : type === 'nam' ? 1 : m;
}
// Chênh lệch: mũi tên + số + %, màu chỉ để hỗ trợ (đã có dấu ▲▼)
function bcDeltaHtml(dl) {
  if (!dl) return '<span class="muted" title="Chưa có số liệu kỳ so sánh">—</span>';
  if (!dl.d) return '<span class="dl eq">0</span>';
  const up = dl.d > 0, pct = dl.pct === null ? 'mới' : (up ? '+' : '') + (dl.pct * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
  return `<span class="dl ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${fmtN(Math.abs(dl.d))} <small>(${pct})</small></span>`;
}
function bcLabel(dim, key, names) {
  if (dim === 'hinhThuc') { const h = IPC.BC_HT.find(x => x.v === key); return h ? h.l : '(chưa rõ hình thức)'; }
  if (dim === 'emailPM') return key ? (names[key] || (S.userMap[key] || {}).hoTen || key) : '(không rõ PM)';
  return key || '(chưa rõ)';
}

async function viewBcKy(Q) {
  if (!S.perms.xemDuAn) { location.hash = '#/'; return; }
  loadingView();
  const T = S.today, curY = +T.slice(0, 4);
  const type = IPC.BC_TYPES.some(t => t.k === Q.get('loai')) ? Q.get('loai') : 'thang';
  const y = Math.min(Math.max(+Q.get('nam') || curY, 2020), curY);
  const n = +Q.get('ky') || bcDefaultN(type, T);
  const dim = BC_DIMS.some(d => d[0] === Q.get('theo')) ? Q.get('theo') : 'phong';
  const met = IPC.BC_METRICS.some(m => m.k === Q.get('ct')) ? Q.get('ct') : 'portGross';
  const D = await bcLoad(y), P = S.perms;
  // Cần cả năm trước nữa khi kỳ trước rơi vào năm y-1 (tháng 1, quý 1, 1H) — dữ liệu trả về đã gồm y-1 và y
  const C = IPC.bcCompare(type, y, n), atoms = D.atoms, chot = D.chot;
  const has = r => IPC.bcHasData(atoms, chot, r);
  const cur = IPC.bcAggregate(atoms, C.cur, dim), prev = IPC.bcAggregate(atoms, C.prev, dim), yoy = IPC.bcAggregate(atoms, C.yoy, dim);
  const hasPrev = has(C.prev), hasYoy = has(C.yoy);
  const keys = [...new Set([...Object.keys(cur.rows), ...Object.keys(prev.rows), ...Object.keys(yoy.rows)])]
    .sort((a, b) => ((cur.rows[b] || {})[met] || 0) - ((cur.rows[a] || {})[met] || 0) || bcLabel(dim, a, D.names).localeCompare(bcLabel(dim, b, D.names), 'vi'));
  const v = (agg, k) => (agg.rows[k] || {})[met] || 0;
  const metL = IPC.BC_METRICS.find(m => m.k === met).l;
  const months = IPC.monthsBetween(C.cur.from, C.cur.to), nChot = months.filter(m => chot.includes(m)).length;
  const future = C.cur.from > T.slice(0, 7);
  const years = []; for (let i = curY; i >= Math.min(2025, curY); i--) years.push(i);
  const sel = (name, opts, val, lab) => `<label class="f">${lab}<select class="in" name="${name}">${opts.map(o => `<option value="${o[0]}"${String(o[0]) === String(val) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;

  view().innerHTML = `<div class="page-head"><div><h1>Báo cáo kỳ</h1><p>${esc(C.cur.label)} — so với kỳ liền trước${C.prev ? ' (' + esc(C.prev.label) + ')' : ''} và cùng kỳ ${esc(C.yoy.label)}.</p></div>
    <div class="actions">${P.xuat ? `<button class="btn primary" id="xk">${ico('down')}Xuất Excel</button>` : '<span class="note">Cần quyền xuất báo cáo để tải file Excel.</span>'}</div></div>
    <form class="panel" id="bf"><div class="panel-b grid-f">
      ${sel('loai', IPC.BC_TYPES.map(t => [t.k, t.l]), type, 'Loại kỳ')}
      ${sel('nam', years.map(x => [x, x]), y, 'Năm')}
      ${type === 'nam' ? '' : sel('ky', bcPeriodOptions(type), n, 'Kỳ')}
      ${sel('theo', BC_DIMS, dim, 'Xem theo')}
      ${sel('ct', IPC.BC_METRICS.map(m => [m.k, m.l]), met, 'Chỉ tiêu trong bảng')}
    </div></form>
    ${future ? `<div class="alert warn">Kỳ này chưa bắt đầu.</div>` : ''}
    <div class="stats bc-stats">${IPC.BC_METRICS.map(m => {
      const c = cur.total[m.k];
      return `<div class="stat"><b>${fmtN(c)}</b><span>${esc(m.l)}</span>
        <div class="bc-cmp"><span>Kỳ trước ${bcDeltaHtml(IPC.bcDelta(c, prev.total[m.k], hasPrev))}</span><span>Cùng kỳ ${bcDeltaHtml(IPC.bcDelta(c, yoy.total[m.k], hasYoy))}</span></div></div>`;
    }).join('')}</div>
    <div class="panel"><div class="panel-h"><h2>${esc(metL)} theo ${esc(BC_DIMS.find(d => d[0] === dim)[1].toLowerCase())}</h2></div>
      ${keys.length ? `<div class="tw"><table class="t bc"><thead><tr><th scope="col">${esc(BC_DIMS.find(d => d[0] === dim)[1])}</th><th class="num" scope="col">Kỳ này</th>
        ${dim === 'hinhThuc' ? '' : IPC.BC_HT.map(h => `<th class="num" scope="col">${esc(h.l)}</th>`).join('')}
        <th class="num" scope="col">Kỳ trước</th><th class="num" scope="col">So kỳ trước</th><th class="num" scope="col">Cùng kỳ</th><th class="num" scope="col">So cùng kỳ</th></tr></thead><tbody>
        ${keys.map(k => { const r = cur.rows[k]; return `<tr><th scope="row">${esc(bcLabel(dim, k, D.names))}</th><td class="num" data-l="Kỳ này"><b>${fmtN(v(cur, k))}</b></td>
          ${dim === 'hinhThuc' ? '' : IPC.BC_HT.map(h => `<td class="num" data-l="${esc(h.l)}">${fmtN(r ? r.ht[h.v][met] : 0)}</td>`).join('')}
          <td class="num" data-l="Kỳ trước">${hasPrev ? fmtN(v(prev, k)) : '—'}</td><td class="num" data-l="So kỳ trước">${bcDeltaHtml(IPC.bcDelta(v(cur, k), v(prev, k), hasPrev))}</td>
          <td class="num" data-l="Cùng kỳ">${hasYoy ? fmtN(v(yoy, k)) : '—'}</td><td class="num" data-l="So cùng kỳ">${bcDeltaHtml(IPC.bcDelta(v(cur, k), v(yoy, k), hasYoy))}</td></tr>`; }).join('')}
        </tbody><tfoot><tr><th scope="row">Tổng</th><td class="num" data-l="Kỳ này"><b>${fmtN(cur.total[met])}</b></td>
          ${dim === 'hinhThuc' ? '' : IPC.BC_HT.map(h => `<td class="num" data-l="${esc(h.l)}">${fmtN(cur.total.ht[h.v][met])}</td>`).join('')}
          <td class="num" data-l="Kỳ trước">${hasPrev ? fmtN(prev.total[met]) : '—'}</td><td class="num" data-l="So kỳ trước">${bcDeltaHtml(IPC.bcDelta(cur.total[met], prev.total[met], hasPrev))}</td>
          <td class="num" data-l="Cùng kỳ">${hasYoy ? fmtN(yoy.total[met]) : '—'}</td><td class="num" data-l="So cùng kỳ">${bcDeltaHtml(IPC.bcDelta(cur.total[met], yoy.total[met], hasYoy))}</td></tr></tfoot></table></div>`
        : `<div class="empty"><h3>Chưa có số liệu trong kỳ</h3><p>Chưa có dự án ký HĐHT hoặc online trong ${esc(C.cur.label)}, và chưa có số liệu đã chốt.</p></div>`}
      <div class="panel-b note">Port gross = port đầu tư, quy mô và số dự án tính theo <b>ngày ký HĐHT</b>; port online = số port FPT khai báo, tính theo <b>ngày online</b>.
        Đầu tư trực tiếp = hình thức CĐT, XHH = Đối tác, Ban quản trị = BQT.
        ${months.length} tháng trong kỳ: ${nChot} tháng đã chốt số (không đổi khi sửa dự án), ${months.length - nChot} tháng tính trực tiếp từ dữ liệu dự án. Tự chốt tháng trước vào ngày ${D.ngayChotSo} hằng tháng.
        ${!hasYoy ? ' Cùng kỳ năm trước chưa có số liệu: BGD có thể nạp số cũ ở Import Excel → sheet Số liệu cũ.' : ''}</div></div>
    ${P.bgd ? `<div class="panel"><div class="panel-h"><h2>Chốt số liệu năm ${y}</h2></div><div class="panel-b"><div class="chot-grid">${Array.from({ length: 12 }, (_, i) => {
      const ym = y + '-' + String(i + 1).padStart(2, '0'), k = (D.kyChot || []).find(r => String(r.thang) === ym), past = ym < T.slice(0, 7);
      return `<div class="chot ${k ? 'on' : ''}"><b>Tháng ${i + 1}</b><span>${k ? esc(k.nguon) + ' · ' + esc(vn(String(k.luc).slice(0, 10))) : past ? 'Chưa chốt' : 'Chưa kết thúc'}</span>
        ${past ? `<div class="row"><button class="btn ghost" type="button" data-chot="${ym}">${k ? 'Chốt lại' : 'Chốt'}</button>${k ? `<button class="btn ghost danger" type="button" data-huy="${ym}">Hủy chốt</button>` : ''}</div>` : ''}</div>`;
    }).join('')}</div><p class="note">Chốt lại: lấy lại số từ dữ liệu dự án hiện tại. Hủy chốt: tháng đó quay về tính trực tiếp. Số nhập tay (số liệu cũ) sẽ bị thay nếu chốt lại.</p></div></div>` : ''}`;

  const form = $('#bf');
  form.onchange = e => {
    const f = Object.fromEntries(new FormData(form));
    if (e.target.name === 'loai') f.ky = bcDefaultN(f.loai, f.nam == curY ? T : f.nam + '-12-31');
    location.hash = '#/bao-cao-ky?' + new URLSearchParams({ loai: f.loai, nam: f.nam, ky: f.ky || 1, theo: f.theo, ct: f.ct }).toString();
  };
  $$('[data-chot],[data-huy]').forEach(b => b.onclick = async () => {
    const ym = b.dataset.chot || b.dataset.huy, huy = !!b.dataset.huy, lab = 'tháng ' + ym.slice(5) + '/' + ym.slice(0, 4);
    const ok = await dialog({ title: huy ? 'Hủy chốt ' + lab + '?' : 'Chốt số liệu ' + lab + '?', body: huy ? '<p>Tháng này sẽ quay về tính trực tiếp từ dữ liệu dự án. Số đã chốt (kể cả số nhập tay) bị xóa khỏi sheet ChotSo.</p>' : '<p>Lấy số từ dữ liệu dự án hiện tại và lưu vào sheet ChotSo. Số đã chốt trước đó của tháng này (kể cả số nhập tay) sẽ bị thay.</p>', buttons: [{ l: 'Thôi', v: false }, { l: huy ? 'Hủy chốt' : 'Chốt', v: true, cls: 'primary' }] });
    if (!ok) return;
    try { await withBusy(b, '…', () => call('bc.chot', { thang: ym, huy })); Object.keys(BC_CACHE).forEach(k => delete BC_CACHE[k]); toast(huy ? 'Đã hủy chốt ' + lab : 'Đã chốt ' + lab); route(); }
    catch (e) { toast(e.message, true); }
  });
  const xk = $('#xk'); if (xk) xk.onclick = () => {
    const sheets = BC_DIMS.map(([d, dl]) => {
      const a = IPC.bcAggregate(atoms, C.cur, d), p = IPC.bcAggregate(atoms, C.prev, d), q = IPC.bcAggregate(atoms, C.yoy, d);
      const ks = [...new Set([...Object.keys(a.rows), ...Object.keys(p.rows), ...Object.keys(q.rows)])];
      const row = (lab, A, Pv, Qv) => {
        const o = { [dl]: lab };
        IPC.BC_METRICS.forEach(m => {
          o[m.l + ' – kỳ này'] = A ? A[m.k] : 0;
          if (d !== 'hinhThuc') IPC.BC_HT.forEach(h => { o[m.l + ' – ' + h.l] = A ? A.ht[h.v][m.k] : 0; });
          o[m.l + ' – kỳ trước'] = hasPrev ? (Pv ? Pv[m.k] : 0) : '';
          o[m.l + ' – cùng kỳ'] = hasYoy ? (Qv ? Qv[m.k] : 0) : '';
        });
        return o;
      };
      return { name: 'Theo ' + dl.toLowerCase(), rows: ks.map(k => row(bcLabel(d, k, D.names), a.rows[k], p.rows[k], q.rows[k])).concat(ks.length ? [row('Tổng', a.total, p.total, q.total)] : []) };
    });
    sheets.unshift({ name: 'Ghi chu', rows: [{ 'Kỳ': C.cur.label, 'Kỳ trước': C.prev ? C.prev.label + (hasPrev ? '' : ' (chưa có số liệu)') : 'Không có', 'Cùng kỳ': C.yoy.label + (hasYoy ? '' : ' (chưa có số liệu)'), 'Tháng đã chốt trong kỳ': nChot + '/' + months.length, 'Xuất lúc': vn(T) }] });
    exportXlsx('Bao_cao_ky_' + C.cur.label.replace(/[^\w]+/g, '_'), sheets);
  };
}
