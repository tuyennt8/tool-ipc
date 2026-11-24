/* FILE SINH TỰ ĐỘNG từ shared/logic.js bởi build.py — KHÔNG sửa trực tiếp. */
/* TOOL IPC — logic dùng chung cho máy chủ (Apps Script) và trình duyệt.
 * build.py chép file này thành apps-script/Logic.gs và web/logic.js — chỉ sửa ở đây.
 * Ngày luôn ở dạng chuỗi 'yyyy-mm-dd' (giờ Việt Nam), tránh lệch múi giờ. */
var IPC = (function () {
  'use strict';

  /* ---------- Danh mục cố định (theo TOOL IPC.xlsx + đặc tả v0.2) ---------- */
  var LISTS = {
    vaiTro: ['BGD', 'TP', 'PM', 'CBDS'],
    phong: ['Ban Giám đốc', 'Đầu tư 1', 'Đầu tư 2', 'Vận hành'],
    trangThaiNS: ['Đang làm việc', 'Đã nghỉ'],
    loaiDuAn: ['CC', 'VP', 'KCN', 'Hỗn hợp', 'KĐT'],
    hinhThuc: ['CĐT', 'BQT', 'Đối tác'],
    trangThaiHD: ['Đã hoạt động', 'Chưa hoạt động'],
    coChua: ['Có', 'Chưa'],
    coKhong: ['Có', 'Không'],
    cachGiaoCBDS: ['Theo khu vực/CN', 'Chia đều', 'TP Vận hành chỉ định']
  };
  var PHONG_DAU_TU = ['Đầu tư 1', 'Đầu tư 2'];

  /* ---------- Trường dữ liệu dự án ----------
   * k: khóa, l: nhãn (trùng tiêu đề cột biểu mẫu Excel), t: kiểu, g: nhóm, req: bắt buộc */
  var FIELDS = [
    { k: 'id', l: 'Mã hệ thống (IPC)', t: 'text', g: 'tt', sys: true },
    { k: 'maInside', l: 'Mã Inside', t: 'text', g: 'tt', hint: 'Mã dự án trên Inside. Chưa có thì để trống.' },
    { k: 'emailPM', l: 'Email PM', t: 'pm', g: 'tt', req: true },
    { k: 'tenDuAn', l: 'Tên dự án', t: 'text', g: 'tt', req: true },
    { k: 'diaChi', l: 'Địa chỉ dự án', t: 'text', g: 'tt', req: true, wide: true },
    { k: 'maCN', l: 'Mã CN', t: 'cn', g: 'tt', req: true },
    { k: 'khuVuc', l: 'Khu vực', t: 'kv', g: 'tt', req: true },
    { k: 'loaiDuAn', l: 'Loại dự án', t: 'list', o: 'loaiDuAn', g: 'tt', req: true },
    { k: 'quyMo', l: 'Quy mô (số căn hộ)', t: 'int', g: 'tt', req: true },
    { k: 'tenCDT', l: 'Tên chủ đầu tư', t: 'text', g: 'tt', req: true },
    { k: 'mstCDT', l: 'MST chủ đầu tư', t: 'mst', g: 'tt', req: true },
    { k: 'ngayKhoiCong', l: 'Ngày khởi công', t: 'date', g: 'tt', req: true },
    { k: 'ngayDuKienBanGiao', l: 'Ngày dự kiến bàn giao', t: 'date', g: 'tt', req: true },
    { k: 'hinhThuc', l: 'Hình thức hợp tác', t: 'list', o: 'hinhThuc', g: 'tt', req: true },
    { k: 'tenDVHT', l: 'Tên đơn vị hợp tác', t: 'text', g: 'tt', req: true },
    { k: 'mstDVHT', l: 'MST đơn vị hợp tác', t: 'mst', g: 'tt', hint: 'Bắt buộc, trừ khi hình thức là BQT.' },
    { k: 'portDauTu', l: 'Port đầu tư', t: 'int', g: 'tt', req: true },
    { k: 'tiLe', l: 'Tỉ lệ dự kiến', t: 'pct', g: 'tt', req: true },
    { k: 'ngayGuiKSTK', l: 'Ngày gửi KSTK', t: 'date', g: 'b12' },
    { k: 'ngayKhaoSat', l: 'Ngày khảo sát thực tế', t: 'date', g: 'b12', hint: 'Mốc gốc để tính hạn khái toán, thẩm định, ký HĐHT.' },
    { k: 'trangThaiHD', l: 'Trạng thái hoạt động', t: 'list', o: 'trangThaiHD', g: 'b12', hint: 'Quyết định hạn ký HĐHT (đã hoạt động: 120, chưa: 180 ngày làm việc).' },
    { k: 'ngayKhaiToan', l: 'Ngày có khái toán', t: 'date', g: 'b12' },
    { k: 'ngayThamDinh', l: 'Ngày có thẩm định', t: 'date', g: 'b12' },
    { k: 'ngayKyHDHT', l: 'Ngày ký HĐHT', t: 'date', g: 'b12' },
    { k: 'ngayCDTYeuCau', l: 'Ngày CĐT yêu cầu hoàn thiện hạ tầng', t: 'date', g: 'b3' },
    { k: 'ngayThiCong', l: 'Ngày thi công theo yêu cầu CĐT', t: 'date', g: 'b3' },
    { k: 'ngayHSXP', l: 'Ngày hoàn thành HSXP thi công', t: 'date', g: 'b3' },
    { k: 'ngayDNTK', l: 'Ngày có DNTK', t: 'date', g: 'b3' },
    { k: 'ngayFPTDuKien', l: 'Ngày FPT dự kiến hoàn thiện hạ tầng', t: 'date', g: 'b3' },
    { k: 'ngayFPTHoanThien', l: 'Ngày FPT hoàn thiện, bàn giao CN', t: 'date', g: 'b3' },
    { k: 'portFPT', l: 'Số port FPT khai báo', t: 'int', g: 'b4' },
    { k: 'daBanGiao', l: 'PM đã bàn giao', t: 'list', o: 'coChua', g: 'b4' },
    { k: 'ngayBBBanGiao', l: 'Ngày BB bàn giao, hạ tầng, nghiệm thu, contact', t: 'date', g: 'b4' },
    { k: 'ngayOnline', l: 'Ngày online', t: 'date', g: 'b4', hint: 'Ngày hoàn thiện nghiệm thu và khai báo port lên hệ thống. Cần có Mã Inside và số port FPT khai báo.' },
    { k: 'ghiChu', l: 'Ghi chú', t: 'text', g: 'tt', wide: true }
  ];
  var GROUPS = [
    { g: 'tt', l: 'Thông tin dự án' },
    { g: 'b12', l: 'Bước 1–2: Hồ sơ và ký HĐHT' },
    { g: 'b3', l: 'Bước 3: Triển khai' },
    { g: 'b4', l: 'Bước 4: Đưa vào khai thác' }
  ];
  var FIELD = {};
  FIELDS.forEach(function (f) { FIELD[f.k] = f; });
  // Cột hệ thống lưu thêm trong sheet DuAn
  var SYS_COLS = [
    ['hanSuaTay', 'Hạn sửa tay (BGD)'], ['khoa', 'Đã khóa'], ['daXoa', 'Đã xóa'],
    ['taoLuc', 'Tạo lúc'], ['taoBoi', 'Tạo bởi'], ['suaLuc', 'Sửa lúc'], ['suaBoi', 'Sửa bởi']
  ];

  /* ---------- Cấu hình mặc định (số liệu lấy từ TOOL IPC.xlsx) ---------- */
  var CONFIG = [
    { k: 'loopEmail', l: 'Email loop IPCMB', t: 'text', v: '' },
    { k: 'cachGiaoCBDS', l: 'Cách giao CBDS mặc định', t: 'list', o: 'cachGiaoCBDS', v: '' },
    { k: 'nhacHetHanHDHT', l: 'Nhắc trước khi hết hạn HĐHT (ngày)', t: 'int', v: '' },
    { k: 'hanKhaiToan', l: 'Hạn có khái toán (ngày làm việc)', t: 'int', v: 60 },
    { k: 'hanThamDinh', l: 'Hạn có thẩm định (ngày làm việc)', t: 'int', v: 90 },
    { k: 'hanHDHTDaHD', l: 'Hạn ký HĐHT – dự án đã hoạt động (ngày làm việc)', t: 'int', v: 120 },
    { k: 'hanHDHTChuaHD', l: 'Hạn ký HĐHT – dự án chưa hoạt động (ngày làm việc)', t: 'int', v: 180 },
    { k: 'canhBaoTruoc', l: 'Cảnh báo trước hạn (ngày)', t: 'int', v: 15 },
    { k: 'nguongPortDauTu', l: 'Ngưỡng port đầu tư / số căn hộ', t: 'pct', v: 0.5 },
    { k: 'nguongPortFPT', l: 'Ngưỡng port FPT khai báo / số căn hộ', t: 'pct', v: 0.6 },
    { k: 'nguongTiLeDoiTac', l: 'Ngưỡng tỉ lệ – Đối tác', t: 'pct', v: 0.3 },
    { k: 'nguongTiLeCDT', l: 'Ngưỡng tỉ lệ – BQT/CĐT', t: 'pct', v: 0.1 },
    { k: 'kpiPortHDHT', l: 'KPI port ký HĐHT/tháng (mặc định)', t: 'int', v: 400 },
    { k: 'kpiPortOnline', l: 'KPI port online/tháng (mặc định)', t: 'int', v: 300 },
    { k: 'lichBaoCaoTuan', l: 'Lịch báo cáo tuần (gửi TP + BGD)', t: 'text', v: 'Thứ 5, 15:00' },
    { k: 'appUrl', l: 'Địa chỉ trang web (link trong email)', t: 'text', v: '' },
    // 24/11/2026: các mốc trước đây cố định trong code — giá trị mặc định theo TOOL IPC.xlsx
    { k: 'nguongCDTYeuCau', l: 'Cảnh báo khi ngày CĐT yêu cầu hoàn thiện còn dưới (ngày)', t: 'int', v: 90 },
    { k: 'nguongThiCong', l: 'Cảnh báo khi ngày thi công theo yêu cầu CĐT còn dưới (ngày)', t: 'int', v: 30 },
    { k: 'hsxpTruocThiCong', l: 'HSXP và DNTK phải xong trước ngày thi công ít nhất (ngày)', t: 'int', v: 30 },
    { k: 'capIMoc', l: 'Cảnh báo cấp I: các mốc trước ngày FPT dự kiến hoàn thiện (ngày)', t: 'marks', v: '45, 30, 25, 20, 15, 10' },
    { k: 'capIINgay', l: 'Cảnh báo đỏ cấp II: số ngày trước ngày CĐT yêu cầu hoàn thiện', t: 'int', v: 15 },
    { k: 'bbQuaNgay', l: 'Biên bản bàn giao: cảnh báo nếu chưa có sau (ngày) kể từ ngày FPT hoàn thiện', t: 'int', v: 7 },
    { k: 'pmKhongCapNhat', l: 'Báo PM không cập nhật quá (ngày làm việc)', t: 'int', v: 10 },
    { k: 'gioCanhBao', l: 'Giờ gửi cảnh báo hằng ngày (0–23)', t: 'hour', v: 7 }
  ];
  // "45, 30, 25" → [45, 30, 25] (giảm dần, không trùng); sai → null
  function parseMarks(s) {
    var parts = String(s === undefined || s === null ? '' : s).split(/[,;\s]+/).filter(Boolean);
    if (!parts.length || parts.some(function (x) { return !/^\d{1,3}$/.test(x); })) return null;
    var seen = {}, out = [];
    parts.map(Number).forEach(function (n) { if (n > 0 && !seen[n]) { seen[n] = 1; out.push(n); } });
    return out.length ? out.sort(function (a, b) { return b - a; }) : null;
  }
  // Lấy số từ cấu hình, sai/trống thì dùng mặc định
  function cfgNum(cfg, k) {
    var v = cfg && cfg[k], d = CONFIG.filter(function (c) { return c.k === k; })[0];
    return v === '' || v === null || v === undefined || isNaN(+v) ? (d ? +d.v : 0) : +v;
  }
  function cfgMarks(cfg) { return parseMarks(cfg && cfg.capIMoc) || [45, 30, 25, 20, 15, 10]; }
  /* "Thứ 5, 15:00" / "thứ 2 8h" / "Chủ nhật, 9:00" → { day: 'THURSDAY', hour: 15, text: 'Thứ 5, 15:00' }.
   * Lịch Google chỉ đặt theo giờ chẵn, nên phút phải là 00 (hoặc bỏ trống). Sai định dạng → null. */
  var WEEKDAY = { 2: 'MONDAY', 3: 'TUESDAY', 4: 'WEDNESDAY', 5: 'THURSDAY', 6: 'FRIDAY', 7: 'SATURDAY', 8: 'SUNDAY' };
  function parseWeekly(s) {
    var m = /^\s*(?:th[ứu]\s*([2-7])|(ch[ủu]\s*nh[ậa]t|cn))\s*[,\-–]?\s*(\d{1,2})\s*(?:(?::|h|g|giờ)\s*(\d{2})?)?\s*$/i.exec(String(s || ''));
    if (!m) return null;
    var thu = m[1] ? +m[1] : 8, hour = +m[3];
    if (hour > 23 || (m[4] && +m[4] !== 0)) return null;
    return { day: WEEKDAY[thu], hour: hour, text: (thu === 8 ? 'Chủ nhật' : 'Thứ ' + thu) + ', ' + ('0' + hour).slice(-2) + ':00' };
  }
  function defaultConfig() { var o = {}; CONFIG.forEach(function (c) { o[c.k] = c.v; }); return o; }

  /* ---------- Ngày tháng ---------- */
  var DAY = 86400000;
  function isDateStr(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }
  function toUTC(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  function fromUTC(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function today(nowMs) { return fromUTC((nowMs || Date.now()) + 7 * 3600000); } // giờ Việt Nam
  function addDays(s, n) { return fromUTC(toUTC(s) + n * DAY); }
  function daysBetween(a, b) { return Math.round((toUTC(b) - toUTC(a)) / DAY); } // b - a
  function isWorkday(s, hol) { var w = new Date(toUTC(s)).getUTCDay(); return w !== 0 && w !== 6 && !(hol && hol[s]); }
  // Ngày gốc + n ngày làm việc (bỏ thứ 7, CN, ngày lễ)
  function addWorkdays(s, n, hol) {
    var d = toUTC(s), c = 0, guard = 0;
    while (c < n && guard++ < 5000) { d += DAY; if (isWorkday(fromUTC(d), hol)) c++; }
    return fromUTC(d);
  }
  function vn(s) { return isDateStr(s) ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : (s || ''); }
  // Nhận dd/mm/yyyy, d/m/yyyy, yyyy-mm-dd, số serial Excel, Date → 'yyyy-mm-dd' (hoặc '' / null nếu sai)
  function normDate(v) {
    if (v === null || v === undefined || v === '') return '';
    if (Object.prototype.toString.call(v) === '[object Date]') {
      if (isNaN(v)) return null;
      return fromUTC(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
    }
    if (typeof v === 'number') return v > 20000 && v < 80000 ? fromUTC(Date.UTC(1899, 11, 30) + Math.round(v) * DAY) : null;
    var s = String(v).trim(), m;
    if (isDateStr(s)) return s;
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s))) {
      var r = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
      return isDateStr(r) ? r : null;
    }
    return null;
  }

  /* ---------- Chuẩn hóa giá trị ---------- */
  function normInt(v) {
    if (v === null || v === undefined || v === '') return '';
    var s = String(v).replace(/[.,\s](?=\d{3}(\D|$))/g, '').trim();
    return /^\d+$/.test(s) ? +s : null;
  }
  function normPct(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return v >= 0 && v <= 1 ? v : (v > 1 && v <= 100 ? v / 100 : null);
    var s = String(v).trim().replace(',', '.'), pct = /%$/.test(s);
    s = s.replace('%', '').trim();
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    var n = +s;
    if (pct || n > 1) n = n / 100;
    return n >= 0 && n <= 1 ? Math.round(n * 10000) / 10000 : null;
  }
  function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function pctText(n) { return n === '' || n === null || n === undefined ? '' : (Math.round(n * 1000) / 10).toString().replace('.', ',') + '%'; }

  /* ---------- Mã số thuế ----------
   * 10 số, hoặc 10 số + '-' + 3 số (đơn vị phụ thuộc). Chữ số thứ 10 là số kiểm tra:
   * 10 − (Σ dᵢ·wᵢ mod 11), w = 31,29,23,19,17,13,7,5,3. Sai số kiểm tra chỉ cảnh báo, không chặn. */
  function mstFormatOk(s) { return /^\d{10}(-\d{3})?$/.test(s); }
  function mstChecksumOk(s) {
    var w = [31, 29, 23, 19, 17, 13, 7, 5, 3], sum = 0;
    for (var i = 0; i < 9; i++) sum += (+s[i]) * w[i];
    return 10 - (sum % 11) === +s[9];
  }

  /* ---------- Chuẩn hóa một dự án nhận từ form/import ---------- */
  function normalizeProject(raw) {
    var p = {}, bad = [];
    FIELDS.forEach(function (f) {
      var v = raw[f.k], n;
      if (f.t === 'date') n = normDate(v);
      else if (f.t === 'int') n = normInt(v);
      else if (f.t === 'pct') n = normPct(v);
      else if (f.t === 'pm') n = str(v).toLowerCase();
      else n = str(v);
      if (n === null) { bad.push(f.k); n = str(v); }
      p[f.k] = n;
    });
    return { p: p, bad: bad };
  }

  /* ---------- Các mốc Bước 1–2 ---------- */
  function milestoneDefs(cfg) {
    return [
      { k: 'hanKhaiToan', done: 'ngayKhaiToan', l: 'Có khái toán', n: +cfg.hanKhaiToan },
      { k: 'hanThamDinh', done: 'ngayThamDinh', l: 'Có thẩm định', n: +cfg.hanThamDinh },
      { k: 'hanKyHDHT', done: 'ngayKyHDHT', l: 'Ký HĐHT' }
    ];
  }
  function parseOverrides(p) { try { return p.hanSuaTay ? JSON.parse(p.hanSuaTay) : {}; } catch (e) { return {}; } }
  // Trạng thái: xong | xong_tre | qua_han | sap_han | dung_han | cho
  function statusOf(han, xong, td, warnDays) {
    if (xong) return han && xong > han ? 'xong_tre' : 'xong';
    if (!han) return 'cho';
    if (td > han) return 'qua_han';
    return daysBetween(td, han) <= warnDays ? 'sap_han' : 'dung_han';
  }
  function milestones(p, cfg, hol, td) {
    var ov = parseOverrides(p), warn = +cfg.canhBaoTruoc || 15;
    return milestoneDefs(cfg).map(function (m) {
      var n = m.n, han = '', note = '';
      if (m.k === 'hanKyHDHT') {
        n = p.trangThaiHD === 'Đã hoạt động' ? +cfg.hanHDHTDaHD : p.trangThaiHD === 'Chưa hoạt động' ? +cfg.hanHDHTChuaHD : 0;
        if (!n && p.ngayKhaoSat) note = 'Chưa chọn trạng thái hoạt động nên chưa tính được hạn.';
      }
      if (p.ngayKhaoSat && n) han = addWorkdays(p.ngayKhaoSat, n, hol);
      var o = ov[m.k];
      if (o && isDateStr(o.v)) { han = o.v; note = 'Hạn do BGD sửa tay' + (o.lyDo ? ': ' + o.lyDo : '') + '.'; }
      return { k: m.k, l: m.l, n: n, han: han, xong: p[m.done] || '', st: statusOf(han, p[m.done], td, warn), note: note, suaTay: !!o };
    });
  }

  /* ---------- Đường tiến độ 8 mốc ---------- */
  var RAIL = [
    { k: 'kstk', l: 'Gửi KSTK' }, { k: 'ks', l: 'Khảo sát' }, { k: 'hanKhaiToan', l: 'Khái toán' },
    { k: 'hanThamDinh', l: 'Thẩm định' }, { k: 'hanKyHDHT', l: 'Ký HĐHT' }, { k: 'ht', l: 'Hoàn thiện hạ tầng' },
    { k: 'bb', l: 'Biên bản bàn giao' }, { k: 'online', l: 'Online' }
  ];
  function rail(p, ms, cfg, td) {
    var M = {}; ms.forEach(function (m) { M[m.k] = m; });
    var r = {};
    r.kstk = { st: p.ngayGuiKSTK ? 'xong' : 'cho', d: p.ngayGuiKSTK };
    r.ks = { st: p.ngayKhaoSat ? 'xong' : 'cho', d: p.ngayKhaoSat };
    ['hanKhaiToan', 'hanThamDinh', 'hanKyHDHT'].forEach(function (k) { r[k] = { st: M[k].st, d: M[k].xong || M[k].han, han: M[k].han }; });
    // Hoàn thiện hạ tầng — cảnh báo cấp I/II/III
    var ht = { st: 'cho', d: p.ngayFPTHoanThien || p.ngayFPTDuKien, han: p.ngayFPTDuKien, cap: 0 };
    if (p.ngayFPTHoanThien) ht.st = 'xong';
    else if (p.ngayFPTDuKien) {
      if (td > p.ngayFPTDuKien) { ht.st = 'qua_han'; ht.cap = 3; }
      else if (p.ngayCDTYeuCau && td <= p.ngayCDTYeuCau && daysBetween(td, p.ngayCDTYeuCau) <= cfgNum(cfg, 'capIINgay')) { ht.st = 'qua_han'; ht.cap = 2; }
      else if (daysBetween(td, p.ngayFPTDuKien) <= cfgMarks(cfg)[0]) { ht.st = 'sap_han'; ht.cap = 1; }
      else ht.st = 'dung_han';
    }
    r.ht = ht;
    // Biên bản bàn giao — quá 7 ngày kể từ ngày FPT hoàn thiện mà chưa có
    var bb = { st: 'cho', d: p.ngayBBBanGiao };
    if (p.ngayBBBanGiao) bb.st = 'xong';
    else if (p.ngayFPTHoanThien) bb.st = daysBetween(p.ngayFPTHoanThien, td) > cfgNum(cfg, 'bbQuaNgay') ? 'qua_han' : 'dung_han';
    r.bb = bb;
    r.online = { st: p.ngayOnline ? 'xong' : 'cho', d: p.ngayOnline };
    return RAIL.map(function (x) { var o = r[x.k]; o.k = x.k; o.l = x.l; return o; });
  }
  function stage(p) {
    if (p.ngayOnline) return 'Đã online';
    if (p.ngayFPTHoanThien) return 'Bước 4: Khai thác';
    if (p.ngayKyHDHT) return 'Bước 3: Triển khai';
    if (p.ngayGuiKSTK || p.ngayKhaoSat) return 'Bước 1–2: Hồ sơ';
    return 'Mới tạo';
  }
  var RANK = { qua_han: 3, sap_han: 2, xong_tre: 1, dung_han: 0, xong: 0, cho: 0 };
  function health(rl) {
    var w = 0; rl.forEach(function (n) { w = Math.max(w, RANK[n.st] || 0); });
    return w === 3 ? 'qua_han' : w === 2 ? 'sap_han' : 'on';
  }
  function enrich(p, cfg, hol, td) {
    var ms = milestones(p, cfg, hol, td), rl = rail(p, ms, cfg, td);
    p._ms = ms; p._rail = rl; p._stage = stage(p); p._health = health(rl);
    return p;
  }

  /* ---------- Kiểm tra dự án ----------
   * ctx: { old, others:[{id,maInside,tenDuAn}], users:{email:{vaiTro,phong,trangThai}}, kv:{}, cn:{}, cfg, today, bad:[] }
   * Trả về { errors:[{k,m}], warnings:[{k,m,code}] } — errors chặn lưu, warnings cần xác nhận. */
  function validateProject(p, ctx) {
    var E = [], W = [], old = ctx.old || {}, cfg = ctx.cfg, td = ctx.today;
    function e(k, m) { E.push({ k: k, m: m }); }
    function w(k, m, code) { W.push({ k: k, m: m, code: code || k }); }
    function changed(k) { return !ctx.old || str(old[k]) !== str(p[k]); }
    (ctx.bad || []).forEach(function (k) {
      var f = FIELD[k];
      e(k, f.l + ': giá trị không hợp lệ' + (f.t === 'date' ? ' (nhập ngày dạng dd/mm/yyyy).' : f.t === 'pct' ? ' (nhập 25% hoặc 0,25).' : ' (nhập số nguyên ≥ 0).'));
    });
    var bad = {}; (ctx.bad || []).forEach(function (k) { bad[k] = 1; });
    FIELDS.forEach(function (f) {
      if (f.req && !bad[f.k] && str(p[f.k]) === '') e(f.k, f.l + ' không được bỏ trống.');
      if (f.t === 'list' && p[f.k] && LISTS[f.o].indexOf(p[f.k]) < 0) e(f.k, f.l + ': chọn một trong ' + LISTS[f.o].join(', ') + '.');
    });
    // PM phải là cán bộ đầu tư đang làm việc
    if (p.emailPM) {
      var u = ctx.users[p.emailPM];
      if (!u) e('emailPM', 'Email PM chưa có trong danh sách nhân sự.');
      else if (u.trangThai === 'Đã nghỉ') e('emailPM', 'PM ' + p.emailPM + ' đã nghỉ, chọn người khác.');
      else if (PHONG_DAU_TU.indexOf(u.phong) < 0 || ['PM', 'TP'].indexOf(u.vaiTro) < 0) e('emailPM', 'Người phụ trách phải là PM/TP thuộc phòng Đầu tư 1 hoặc Đầu tư 2.');
    }
    if (p.maCN && !ctx.cn[p.maCN]) e('maCN', 'Mã CN "' + p.maCN + '" chưa có trong danh mục chi nhánh.');
    if (p.khuVuc && !ctx.kv[p.khuVuc]) e('khuVuc', 'Khu vực "' + p.khuVuc + '" chưa có trong danh mục khu vực.');
    // Mã số thuế
    ['mstCDT', 'mstDVHT'].forEach(function (k) {
      if (!p[k]) return;
      if (!mstFormatOk(p[k])) e(k, FIELD[k].l + ' phải gồm 10 chữ số, hoặc 10 chữ số-3 chữ số (VD dạng 0123456789-001).');
      else if (!mstChecksumOk(p[k]) && changed(k)) w(k, FIELD[k].l + ' ' + p[k] + ' có chữ số kiểm tra không khớp. Kiểm tra lại với giấy phép kinh doanh.', 'mst');
    });
    if (!p.mstDVHT && p.hinhThuc && p.hinhThuc !== 'BQT') e('mstDVHT', 'MST đơn vị hợp tác chỉ được bỏ trống khi hình thức là BQT.');
    // Trùng
    var others = ctx.others || [];
    if (p.maInside) others.forEach(function (o) { if (o.maInside && o.maInside === p.maInside && o.id !== p.id) e('maInside', 'Mã Inside ' + p.maInside + ' đã dùng cho dự án ' + (o.tenDuAn || o.id) + '.'); });
    if (p.tenDuAn && changed('tenDuAn')) others.forEach(function (o) { if (o.tenDuAn === p.tenDuAn && o.id !== p.id) w('tenDuAn', 'Tên dự án trùng với dự án ' + (o.maInside || o.id) + '. Hệ thống sẽ báo loop IPCMB.', 'trungTen'); });
    // Điều kiện các bước
    if (p.ngayKhaoSat && !p.trangThaiHD) e('trangThaiHD', 'Chọn trạng thái hoạt động khi đã có ngày khảo sát thực tế (để tính hạn ký HĐHT).');
    if (p.ngayOnline) {
      if (!p.maInside) e('maInside', 'Cần Mã Inside trước khi nhập ngày online.');
      if (p.portFPT === '' || p.portFPT === null || p.portFPT === undefined) e('portFPT', 'Cần số port FPT khai báo trước khi nhập ngày online.');
    }
    // Ngưỡng (TOOL IPC.xlsx)
    var q = +p.quyMo;
    if (q > 0 && p.portDauTu !== '' && +p.portDauTu > q * cfg.nguongPortDauTu && (changed('portDauTu') || changed('quyMo')))
      w('portDauTu', 'Port đầu tư (' + p.portDauTu + ') lớn hơn ' + pctText(+cfg.nguongPortDauTu) + ' số căn hộ (' + q + ').');
    if (q > 0 && p.portFPT !== '' && p.portFPT !== null && +p.portFPT > q * cfg.nguongPortFPT && (changed('portFPT') || changed('quyMo')))
      w('portFPT', 'Số port FPT khai báo (' + p.portFPT + ') lớn hơn ' + pctText(+cfg.nguongPortFPT) + ' số căn hộ (' + q + ').');
    if (p.tiLe !== '' && p.hinhThuc && (changed('tiLe') || changed('hinhThuc'))) {
      if (p.hinhThuc === 'Đối tác' && +p.tiLe > +cfg.nguongTiLeDoiTac) w('tiLe', 'Hình thức Đối tác nhưng tỉ lệ ' + pctText(+p.tiLe) + ' vượt ' + pctText(+cfg.nguongTiLeDoiTac) + '.');
      if ((p.hinhThuc === 'BQT' || p.hinhThuc === 'CĐT') && +p.tiLe > +cfg.nguongTiLeCDT) w('tiLe', 'Hình thức ' + p.hinhThuc + ' nhưng tỉ lệ ' + pctText(+p.tiLe) + ' vượt ' + pctText(+cfg.nguongTiLeCDT) + '.');
    }
    // Bước 3
    var nCDT = cfgNum(cfg, 'nguongCDTYeuCau'), nTC = cfgNum(cfg, 'nguongThiCong'), nHS = cfgNum(cfg, 'hsxpTruocThiCong');
    if (p.ngayCDTYeuCau && changed('ngayCDTYeuCau') && daysBetween(td, p.ngayCDTYeuCau) < nCDT)
      w('ngayCDTYeuCau', 'Ngày CĐT yêu cầu hoàn thiện hạ tầng chỉ còn ' + daysBetween(td, p.ngayCDTYeuCau) + ' ngày (dưới ' + nCDT + ' ngày).');
    if (p.ngayThiCong && changed('ngayThiCong') && daysBetween(td, p.ngayThiCong) < nTC)
      w('ngayThiCong', 'Ngày thi công theo yêu cầu CĐT chỉ còn ' + daysBetween(td, p.ngayThiCong) + ' ngày (dưới ' + nTC + ' ngày).');
    ['ngayHSXP', 'ngayDNTK'].forEach(function (k) {
      if (p[k] && p.ngayThiCong && (changed(k) || changed('ngayThiCong')) && daysBetween(p[k], p.ngayThiCong) < nHS)
        w(k, FIELD[k].l + ' (' + vn(p[k]) + ') không sớm hơn ngày thi công theo yêu cầu CĐT (' + vn(p.ngayThiCong) + ') ít nhất ' + nHS + ' ngày.');
    });
    return { errors: E, warnings: W };
  }

  /* =================== GĐ3: Đối soát =================== */
  LISTS.kyDS = ['Tháng', 'Quý', '6 tháng', 'Năm'];
  var KY_MONTHS = { 'Tháng': 1, 'Quý': 3, '6 tháng': 6, 'Năm': 12 };
  // Nhãn trùng tiêu đề sheet DoiSoat trong biểu mẫu Excel
  var DS_FIELDS = [
    { k: 'maInside', l: 'Mã Inside', t: 'text', req: true },
    { k: 'maDSDoiSoat', l: 'Mã DA đối soát', t: 'text', req: true },
    { k: 'tenDuAn', l: 'Tên dự án', t: 'text', req: true },
    { k: 'diaChi', l: 'Địa chỉ chi tiết', t: 'text', req: true, wide: true },
    { k: 'maCN', l: 'Mã CN', t: 'cn', req: true },
    { k: 'khuVuc', l: 'Khu vực', t: 'kv', req: true },
    { k: 'emailCBDT', l: 'Email CB phụ trách đầu tư', t: 'pm', req: true },
    { k: 'emailCBDS', l: 'Email CB phụ trách đối soát', t: 'cbds', req: true },
    { k: 'ngayKyHDHT', l: 'Ngày ký HĐHT', t: 'date', req: true },
    { k: 'thoiHanNam', l: 'Thời hạn HĐHT (năm)', t: 'num', req: true },
    { k: 'kyGiaHanNam', l: 'Kỳ gia hạn (năm)', t: 'num' },
    { k: 'tiLe', l: 'Tỉ lệ', t: 'pct', req: true },
    { k: 'ngayBatDau', l: 'Ngày bắt đầu kỳ đối soát', t: 'date', hint: 'Ngày có khách hàng đầu tiên. PM hoặc CBDS điền; để trống thì hệ thống nhắc hằng tuần.' },
    { k: 'dsDoanhThu', l: 'Đối soát doanh thu', t: 'list', o: 'coKhong', req: true },
    { k: 'kyDoanhThu', l: 'Kỳ đối soát doanh thu', t: 'list', o: 'kyDS', dep: 'dsDoanhThu' },
    { k: 'dsTienDien', l: 'Đối soát tiền điện', t: 'list', o: 'coKhong', req: true },
    { k: 'kyTienDien', l: 'Kỳ đối soát tiền điện', t: 'list', o: 'kyDS', dep: 'dsTienDien' },
    { k: 'dsISP', l: 'Đối soát ISP khác/phòng máy', t: 'list', o: 'coKhong', req: true },
    { k: 'kyISP', l: 'Kỳ đối soát ISP khác/phòng máy', t: 'list', o: 'kyDS', dep: 'dsISP' },
    { k: 'ghiChu', l: 'Ghi chú', t: 'text', wide: true }
  ];
  var DS_FIELD = {}; DS_FIELDS.forEach(function (f) { DS_FIELD[f.k] = f; });
  var DS_SYS = [['id', 'Mã hồ sơ'], ['maDuAn', 'Mã dự án (IPC)'], ['nguon', 'Nguồn'], ['soLanGiaHan', 'Số lần gia hạn'],
    ['daXoa', 'Đã xóa'], ['taoLuc', 'Tạo lúc'], ['taoBoi', 'Tạo bởi'], ['suaLuc', 'Sửa lúc'], ['suaBoi', 'Sửa bởi']];
  var DS_LOAI = [
    { k: 'doanhThu', l: 'Doanh thu', on: 'dsDoanhThu', ky: 'kyDoanhThu' },
    { k: 'tienDien', l: 'Tiền điện', on: 'dsTienDien', ky: 'kyTienDien' },
    { k: 'isp', l: 'ISP khác/phòng máy', on: 'dsISP', ky: 'kyISP' }
  ];
  function normNum(v) {
    if (v === null || v === undefined || v === '') return '';
    var s = String(v).trim().replace(',', '.');
    return /^\d+(\.\d+)?$/.test(s) ? +s : null;
  }
  // Cộng tháng, giữ ngày; ngày không tồn tại thì lấy ngày cuối tháng (31/01 + 1 tháng = 28 hoặc 29/02)
  function addMonths(s, n) {
    var y = +s.slice(0, 4), m = +s.slice(5, 7) - 1 + n, d = +s.slice(8, 10);
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return fromUTC(Date.UTC(y, m, Math.min(d, last)));
  }
  function normalizeDS(raw) {
    var r = {}, bad = [];
    DS_FIELDS.forEach(function (f) {
      var v = raw[f.k], n;
      if (f.t === 'date') n = normDate(v);
      else if (f.t === 'num') n = normNum(v);
      else if (f.t === 'pct') n = normPct(v);
      else if (f.t === 'pm' || f.t === 'cbds') n = str(v).toLowerCase();
      else n = str(v);
      if (n === null) { bad.push(f.k); n = str(v); }
      r[f.k] = n;
    });
    return { r: r, bad: bad };
  }
  // Ngày hết hạn HĐHT = ngày ký + (thời hạn + số lần gia hạn × kỳ gia hạn) năm
  function hetHanHDHT(r) {
    if (!isDateStr(r.ngayKyHDHT) || !(+r.thoiHanNam > 0)) return '';
    var nam = +r.thoiHanNam + (+r.soLanGiaHan || 0) * (+r.kyGiaHanNam || 0);
    return addMonths(r.ngayKyHDHT, Math.round(nam * 12));
  }
  /* Các kỳ đối soát của 1 hồ sơ. done: { '<loai>|<n>': {trangThai, ngay} }.
   * Kỳ n có hạn = ngày bắt đầu + n × độ dài kỳ. Liệt kê đến kỳ đầu tiên chưa tới hạn, không quá ngày hết hạn HĐHT. */
  function periods(r, done, td, warnDays) {
    var out = [], end = hetHanHDHT(r), warn = warnDays || 15;
    if (!isDateStr(r.ngayBatDau)) return out;
    DS_LOAI.forEach(function (L) {
      if (r[L.on] !== 'Có' || !KY_MONTHS[r[L.ky]]) return;
      var step = KY_MONTHS[r[L.ky]];
      for (var n = 1; n <= 600; n++) {
        var han = addMonths(r.ngayBatDau, n * step), tu = addMonths(r.ngayBatDau, (n - 1) * step);
        if (end && tu >= end) break;
        var d = done && done[L.k + '|' + n], st;
        if (d) st = 'xong';
        else if (td >= han) st = 'den_han';
        else st = daysBetween(td, han) <= warn ? 'sap_han' : 'chua';
        out.push({ loai: L.k, loaiTen: L.l, n: n, tu: tu, han: han, st: st, trangThai: d ? d.trangThai : '', ngay: d ? d.ngay : '', nguoi: d ? d.nguoi : '' });
        if (han > td) break; // dừng sau kỳ đầu tiên chưa tới hạn
      }
    });
    return out.sort(function (a, b) { return a.han < b.han ? -1 : a.han > b.han ? 1 : 0; });
  }
  function dsStatus(r, ps) {
    if (!r.emailCBDS) return 'chua_giao';
    var miss = DS_FIELDS.some(function (f) { return f.req && str(r[f.k]) === ''; });
    if (miss || !r.ngayBatDau) return 'thieu';
    if (ps.some(function (p) { return p.st === 'den_han'; })) return 'den_han';
    if (ps.some(function (p) { return p.st === 'sap_han'; })) return 'sap_han';
    return 'on';
  }
  /* ctx: { old, users, kv, cn, others:[{id,maDSDoiSoat,maInside}], project (dự án liên kết), bad } */
  function validateDS(r, ctx) {
    var E = [], W = [];
    function e(k, m) { E.push({ k: k, m: m }); }
    (ctx.bad || []).forEach(function (k) { e(k, DS_FIELD[k].l + ': giá trị không hợp lệ.'); });
    var bad = {}; (ctx.bad || []).forEach(function (k) { bad[k] = 1; });
    DS_FIELDS.forEach(function (f) {
      if (f.req && !bad[f.k] && str(r[f.k]) === '') e(f.k, f.l + ' không được bỏ trống.');
      if (f.t === 'list' && r[f.k] && LISTS[f.o].indexOf(r[f.k]) < 0) e(f.k, f.l + ': chọn một trong ' + LISTS[f.o].join(', ') + '.');
      if (f.dep && r[f.dep] === 'Có' && !r[f.k]) e(f.k, 'Chọn ' + f.l.toLowerCase() + ' khi đã chọn Có.');
    });
    var u = r.emailCBDS && ctx.users[r.emailCBDS];
    if (r.emailCBDS && (!u || u.vaiTro !== 'CBDS' || u.trangThai === 'Đã nghỉ')) e('emailCBDS', 'Cán bộ đối soát phải là CBDS đang làm việc trong danh sách nhân sự.');
    var pm = r.emailCBDT && ctx.users[r.emailCBDT];
    if (r.emailCBDT && (!pm || PHONG_DAU_TU.indexOf(pm.phong) < 0)) e('emailCBDT', 'Cán bộ đầu tư phải thuộc phòng Đầu tư 1 hoặc Đầu tư 2.');
    if (r.maCN && !ctx.cn[r.maCN]) e('maCN', 'Mã CN "' + r.maCN + '" chưa có trong danh mục chi nhánh.');
    if (r.khuVuc && !ctx.kv[r.khuVuc]) e('khuVuc', 'Khu vực "' + r.khuVuc + '" chưa có trong danh mục khu vực.');
    (ctx.others || []).forEach(function (o) {
      if (r.maDSDoiSoat && o.maDSDoiSoat === r.maDSDoiSoat && o.id !== r.id) e('maDSDoiSoat', 'Mã DA đối soát ' + r.maDSDoiSoat + ' đã có ở hồ sơ ' + o.id + '.');
    });
    if (ctx.project && ctx.project.ngayKyHDHT && r.ngayKyHDHT && ctx.project.ngayKyHDHT !== r.ngayKyHDHT)
      W.push({ k: 'ngayKyHDHT', m: 'Ngày ký HĐHT (' + vn(r.ngayKyHDHT) + ') khác ngày ký đã lưu ở dự án (' + vn(ctx.project.ngayKyHDHT) + ').', code: 'ngayKy' });
    return { errors: E, warnings: W };
  }

  /* =================== KPI & thống kê =================== */
  function inRange(d, from, to) { return !!d && d >= from && d <= to; }
  function monthRange(ym) { var s = ym + '-01'; return { from: s, to: addDays(addMonths(s, 1), -1) }; }
  function quarterStart(ym) { var m = +ym.slice(5, 7); return ym.slice(0, 4) + '-' + ('0' + (Math.floor((m - 1) / 3) * 3 + 1)).slice(-2); }
  function prevMonth(ym) { return addMonths(ym + '-01', -1).slice(0, 7); }
  // Đếm hoạt động trong khoảng ngày [from, to] — dùng cho dashboard và báo cáo
  var STAT_DEFS = [
    { k: 'kstk', l: 'Gửi KSTK', d: 'ngayGuiKSTK' }, { k: 'khaoSat', l: 'Khảo sát', d: 'ngayKhaoSat' },
    { k: 'khaiToan', l: 'Khái toán', d: 'ngayKhaiToan' }, { k: 'thamDinh', l: 'Thẩm định', d: 'ngayThamDinh' },
    { k: 'kyHDHT', l: 'Ký HĐHT', d: 'ngayKyHDHT' }, { k: 'dntk', l: 'DNTK', d: 'ngayDNTK' },
    { k: 'hsxp', l: 'HSXP', d: 'ngayHSXP' }, { k: 'online', l: 'Online', d: 'ngayOnline' }
  ];
  function periodStats(ps, from, to) {
    var o = { soDuAn: 0, portHDHT: 0, portOnline: 0 };
    STAT_DEFS.forEach(function (s) { o[s.k] = 0; });
    ps.forEach(function (p) {
      if (inRange(p.ngayGuiKSTK, from, to)) o.soDuAn++;
      STAT_DEFS.forEach(function (s) { if (inRange(p[s.d], from, to)) o[s.k]++; });
      if (inRange(p.ngayKyHDHT, from, to)) o.portHDHT += +p.portDauTu || 0;
      if (inRange(p.ngayOnline, from, to)) o.portOnline += +p.portFPT || 0;
    });
    return o;
  }
  /* KPI theo PM cho tháng ym ('yyyy-mm'):
   * port ký HĐHT = Σ port đầu tư của dự án có ngày ký HĐHT trong tháng; port online = Σ port FPT khai báo có ngày online trong tháng.
   * Quý: lũy kế từ đầu quý đến hết tháng ym, chỉ tiêu = KPI tháng × số tháng đã qua của quý. */
  function kpiByPM(ps, users, cfg, ym) {
    var pms = Object.keys(users).map(function (e) { return users[e]; }).filter(function (u) {
      return u.vaiTro === 'PM' && PHONG_DAU_TU.indexOf(u.phong) >= 0 && u.trangThai !== 'Đã nghỉ';
    });
    var mr = monthRange(ym), prev = monthRange(prevMonth(ym)), qs = quarterStart(ym);
    var qFrom = qs + '-01', nMonths = (+ym.slice(5, 7)) - (+qs.slice(5, 7)) + 1;
    return pms.map(function (u) {
      var mine = ps.filter(function (p) { return p.emailPM === u.email; });
      var tHD = +u.kpiHDHT || +cfg.kpiPortHDHT || 0, tON = +u.kpiOnline || +cfg.kpiPortOnline || 0;
      var m = periodStats(mine, mr.from, mr.to), pv = periodStats(mine, prev.from, prev.to), q = periodStats(mine, qFrom, mr.to);
      var datThang = m.portHDHT >= tHD && m.portOnline >= tON, datThangTruoc = pv.portHDHT >= tHD && pv.portOnline >= tON;
      return {
        email: u.email, hoTen: u.hoTen, phong: u.phong, kpiHDHT: tHD, kpiOnline: tON,
        thang: m, quy: q, quyKpiHDHT: tHD * nMonths, quyKpiOnline: tON * nMonths,
        datThang: datThang, datQuy: q.portHDHT >= tHD * nMonths && q.portOnline >= tON * nMonths,
        khongDat2Thang: !datThang && !datThangTruoc
      };
    });
  }

  return {
    LISTS: LISTS, PHONG_DAU_TU: PHONG_DAU_TU, FIELDS: FIELDS, FIELD: FIELD, GROUPS: GROUPS, SYS_COLS: SYS_COLS,
    DS_FIELDS: DS_FIELDS, DS_FIELD: DS_FIELD, DS_SYS: DS_SYS, DS_LOAI: DS_LOAI, KY_MONTHS: KY_MONTHS,
    normNum: normNum, addMonths: addMonths, normalizeDS: normalizeDS, hetHanHDHT: hetHanHDHT, periods: periods,
    dsStatus: dsStatus, validateDS: validateDS, STAT_DEFS: STAT_DEFS, periodStats: periodStats, kpiByPM: kpiByPM,
    monthRange: monthRange, quarterStart: quarterStart, prevMonth: prevMonth,
    CONFIG: CONFIG, defaultConfig: defaultConfig, parseWeekly: parseWeekly, parseMarks: parseMarks, cfgNum: cfgNum, cfgMarks: cfgMarks, RAIL: RAIL,
    isDateStr: isDateStr, today: today, addDays: addDays, daysBetween: daysBetween, addWorkdays: addWorkdays,
    isWorkday: isWorkday, vn: vn, normDate: normDate, normInt: normInt, normPct: normPct, str: str, pctText: pctText,
    mstFormatOk: mstFormatOk, mstChecksumOk: mstChecksumOk, normalizeProject: normalizeProject,
    milestones: milestones, rail: rail, stage: stage, health: health, enrich: enrich, parseOverrides: parseOverrides,
    validateProject: validateProject
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IPC;
