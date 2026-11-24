/* TOOL IPC — File đính kèm cho dự án và hồ sơ đối soát (dùng tiện ích của app.js: $, $$, esc, call, ico, toast, confirmDlg). */
'use strict';

const fileSize = n => n >= 1048576 ? (n / 1048576).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(n / 1024)).toLocaleString('vi-VN') + ' KB';
// Khóa nút trong lúc gửi yêu cầu (tránh bấm 2 lần), hiện chữ trạng thái rồi trả lại như cũ
async function withBusy(btn, label, fn) {
  const html = btn.innerHTML; btn.disabled = true; btn.textContent = label;
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}
const readBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1] || '');
  r.onerror = () => rej(new Error('Không đọc được file ' + file.name));
  r.readAsDataURL(file);
});
async function downloadAttachment(fid, btn) {
  try {
    const r = await withBusy(btn, 'Đang tải…', () => call('files.download', { fileId: fid }));
    const bin = atob(r.data), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: r.mimeType }));
    const a = document.createElement('a'); a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } catch (e) { toast(e.message, true); }
}
async function attachPanel(box, kind, id) {
  box.innerHTML = `<div class="panel"><div class="empty muted">Đang tải…</div></div>`;
  let r;
  try { r = await call('files.list', { kind, id }); } catch (e) { box.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return; }
  const what = kind === 'du_an' ? 'dự án' : 'hồ sơ';
  box.innerHTML = `<div class="panel">
    <div class="panel-h"><h2>File đính kèm (${r.files.length})</h2>
      ${r.canUpload ? `<div class="actions"><button class="btn primary" type="button" id="attPick">${ico('upload')}Tải file lên</button><input type="file" id="attIn" multiple accept="${r.types.map(t => '.' + t).join(',')}" hidden aria-label="Chọn file để tải lên"></div>` : ''}</div>
    <ul class="att-status" id="attStatus" aria-live="polite"></ul>
    ${r.files.length ? `<div class="tw"><table class="t cards"><thead><tr><th>Tên file</th><th>Dung lượng</th><th>Người tải lên</th><th>Thời điểm</th><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody>
      ${r.files.map(f => `<tr><td class="name"><button type="button" class="linkbtn" data-dl="${esc(f.fileId)}" title="Tải về">${esc(f.ten)}</button><span>${esc(String(f.kieu).toUpperCase())}</span></td>
        <td data-l="Dung lượng">${fileSize(f.kichThuoc)}</td><td data-l="Người tải">${esc(f.tenBoi)}</td><td data-l="Lúc" class="small">${esc(String(f.luc).replace('T', ' '))}</td>
        <td><div class="actions"><button type="button" class="btn ghost" data-dl="${esc(f.fileId)}">${ico('down')}Tải về</button>${f.xoaDuoc ? `<button type="button" class="btn ghost danger" data-del="${esc(f.fileId)}" data-name="${esc(f.ten)}" aria-label="Xóa ${esc(f.ten)}">${ico('trash')}</button>` : ''}</div></td></tr>`).join('')}
      </tbody></table></div>`
    : `<div class="empty"><h3>Chưa có file nào</h3><p>${r.canUpload ? `Bấm <b>Tải file lên</b> để đính kèm biên bản, hợp đồng, ảnh hiện trạng… cho ${what} này.` : `Chưa có ai đính kèm file cho ${what} này.`}</p></div>`}
    <div class="panel-b note">Nhận ${r.types.join(', ')}; tối đa ${fileSize(r.maxBytes)} mỗi file. File lưu trong Google Drive của chủ web; chỉ người xem được ${what} này mới tải về được. Xóa file là chuyển vào Thùng rác Drive (chủ web khôi phục được trong 30 ngày).</div>
  </div>`;
  $$('[data-dl]', box).forEach(b => b.onclick = () => downloadAttachment(b.dataset.dl, b));
  $$('[data-del]', box).forEach(b => b.onclick = async () => {
    if (!await confirmDlg('Xóa file', `Xóa file <b>${esc(b.dataset.name)}</b>? File được chuyển vào Thùng rác Drive của chủ web.`, 'Xóa file', 'danger')) return;
    try { await withBusy(b, '…', () => call('files.delete', { fileId: b.dataset.del })); toast('Đã xóa file'); attachPanel(box, kind, id); }
    catch (e) { toast(e.message, true); }
  });
  const pick = $('#attPick', box), inp = $('#attIn', box);
  if (!pick) return;
  pick.onclick = () => inp.click();
  inp.onchange = async () => {
    const files = Array.from(inp.files || []); inp.value = '';
    if (!files.length) return;
    const st = $('#attStatus', box), line = (name, msg, cls) => `<li class="${cls}"><b>${esc(name)}</b>: ${esc(msg)}</li>`;
    st.innerHTML = files.map(f => line(f.name, 'đang chờ…', '')).join('');
    let ok = 0;
    await withBusy(pick, 'Đang tải lên…', async () => {
      for (let i = 0; i < files.length; i++) {
        const f = files[i], ext = (f.name.split('.').pop() || '').toLowerCase();
        if (!r.types.includes(ext)) { st.children[i].outerHTML = line(f.name, 'không nhận loại file này', 'res-err'); continue; }
        if (f.size > r.maxBytes) { st.children[i].outerHTML = line(f.name, 'quá ' + fileSize(r.maxBytes), 'res-err'); continue; }
        st.children[i].outerHTML = line(f.name, 'đang tải lên…', '');
        try { await call('files.upload', { kind, id, name: f.name, data: await readBase64(f) }); st.children[i].outerHTML = line(f.name, 'đã tải lên', 'res-ok'); ok++; }
        catch (e) { st.children[i].outerHTML = line(f.name, e.message, 'res-err'); }
      }
    });
    if (ok) {
      toast('Đã tải lên ' + ok + ' file');
      const keep = st.innerHTML;
      await attachPanel(box, kind, id);
      const s2 = $('#attStatus', box); if (s2) s2.innerHTML = keep;
    }
  };
}

/* ================= Tra cứu MST (Casso IDKit qua máy chủ) =================
   Kết quả chỉ để đối chiếu; điền tên chỉ khi người dùng bấm "Điền tên". */
const MST_NAME_FIELD = { mstCDT: 'tenCDT', mstDVHT: 'tenDVHT' };
const GDT_URL = 'https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp';
document.addEventListener('click', async ev => {
  const b = ev.target.closest('button[data-mst]');
  if (!b) return;
  ev.preventDefault();
  const form = b.form, k = b.dataset.mst, inp = form.elements[k], out = document.getElementById('mr_' + k);
  const mst = (inp.value || '').trim(), gdt = `<a href="${GDT_URL}" target="_blank" rel="noopener noreferrer">trang Tổng cục Thuế</a>`;
  if (!IPC.mstFormatOk(mst)) { out.innerHTML = `<p class="res-err">Nhập MST đủ 10 chữ số (hoặc 10 số-3 số) rồi bấm Tra cứu.</p>`; inp.focus(); return; }
  out.innerHTML = '<p class="muted">Đang tra cứu…</p>';
  try {
    const r = await withBusy(b, 'Đang tra…', () => call('mst.lookup', { mst }));
    if (r.chuaCauHinh) { out.innerHTML = `<p class="muted">${esc(r.msg)} Tra trên ${gdt}.</p>`; return; }
    if (r.notFound) { out.innerHTML = `<p class="res-err">Không tìm thấy doanh nghiệp có MST ${esc(mst)}. Kiểm tra lại hoặc tra trên ${gdt}.</p>`; return; }
    const x = r.business, active = /đang hoạt động/i.test(x.status), nk = MST_NAME_FIELD[k], nameEl = nk && form.elements[nk];
    out.innerHTML = `<div class="mst-card"><b>${esc(x.name)}</b>
      ${x.address ? `<div>${esc(x.address)}</div>` : ''}
      <div class="small"><span class="tag ${active ? 'xong' : 'qua_han'}">${esc(x.status || 'Không rõ trạng thái')}</span>${x.taxDepartment ? ' · ' + esc(x.taxDepartment) : ''}</div>
      ${nameEl && nameEl.value.trim() !== x.name ? `<button class="btn ghost" type="button" data-fill>${nameEl.value.trim() ? 'Thay tên bằng tên này' : 'Điền tên'}</button>` : ''}</div>`;
    const fill = out.querySelector('[data-fill]');
    if (fill) fill.onclick = e => { e.preventDefault(); nameEl.value = x.name; nameEl.dispatchEvent(new Event('input', { bubbles: true })); fill.remove(); toast('Đã điền tên theo MST'); };
  } catch (e) { out.innerHTML = `<p class="res-err">${esc(e.message)} Có thể tra trên ${gdt}.</p>`; }
});
